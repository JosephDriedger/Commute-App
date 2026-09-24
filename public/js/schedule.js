// Weekly schedule. Trips sit on the day they happen, and a trip can repeat
// every week (a class, a shift) so you only enter it once.
var currentUser;
var savedRoutes = [];            // offered in the form, and they carry a travel time
var allSchedules = [];           // {id, ...trip}
var weekStart = startOfWeek(new Date());
var editingScheduleId = null;
var countdownTimer = null;

var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

firebase.auth().onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        loadRouteChoices();
        loadSchedules();
    } else {
        // No user is signed in.
        window.location.href = "./login";
    }
});

function schedulesRef() {
    return db.collection("users").doc(currentUser.uid).collection("Schedules");
}

/* ------------------------------------------------------------------ */
/* Dates                                                                */
/* ------------------------------------------------------------------ */

// Monday of the week containing this date.
function startOfWeek(date) {
    let start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    let weekday = (start.getDay() + 6) % 7;   // Monday = 0
    start.setDate(start.getDate() - weekday);
    return start;
}

function addDays(date, days) {
    let copy = new Date(date.getTime());
    copy.setDate(copy.getDate() + days);
    return copy;
}

// "2026-09-24"
function toISODate(date) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function fromISODate(value) {
    let [year, month, day] = (value || "").split("-").map(Number);
    return new Date(year, (month || 1) - 1, day || 1);
}

function isSameDay(a, b) {
    return toISODate(a) === toISODate(b);
}

// Time (in ms) at which a trip happens, using its saved timezone offset.
function scheduleTime(schedule, onDate) {
    let dateValue = onDate ? toISODate(onDate) : schedule.date;
    if (!dateValue) {
        return NaN;
    }
    let [year, month, day] = dateValue.split("-").map(Number);
    let [hour, minute] = (schedule.time || "23:59").split(":").map(Number);
    let offsetHours = parseFloat(schedule.timezone) || 0;
    return Date.UTC(year, month - 1, day, hour, minute) - offsetHours * 3600000;
}

// "14:05" -> "2:05 PM"
function formatTime(time) {
    if (!time) {
        return "";
    }
    let [hour, minute] = time.split(":").map(Number);
    return new Date(2000, 0, 1, hour, minute)
        .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

// Clock time in the timezone the trip was saved with, not the browser's.
function formatClock(millis, offsetHours) {
    let shifted = new Date(millis + (parseFloat(offsetHours) || 0) * 3600000);
    let hours = shifted.getUTCHours();
    let minutes = shifted.getUTCMinutes();
    let suffix = hours >= 12 ? "PM" : "AM";
    let hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return hour12 + ":" + String(minutes).padStart(2, "0") + " " + suffix;
}

/* ------------------------------------------------------------------ */
/* Loading and drawing the week                                         */
/* ------------------------------------------------------------------ */

function loadSchedules() {
    schedulesRef().get()
        .then(snapshot => {
            allSchedules = [];
            let cutoff = toISODate(addDays(new Date(), -7));

            snapshot.forEach(doc => {
                let schedule = doc.data();
                schedule.id = doc.id;

                // Tidy up one-off trips more than a week old
                if (!schedule.repeatWeekly && schedule.date && schedule.date < cutoff) {
                    doc.ref.delete().catch(error => console.log("Error removing schedule: ", error));
                    return;
                }
                allSchedules.push(schedule);
            });

            renderWeek();
        })
        .catch(error => console.log("Error loading schedules: ", error));
}

// Trips on a given day: one-off trips on that date, plus weekly repeats that
// started on or before it.
function schedulesOn(date) {
    let iso = toISODate(date);
    let weekday = (date.getDay() + 6) % 7;

    return allSchedules
        .filter(schedule => {
            if (schedule.repeatWeekly) {
                let startsOn = schedule.date || iso;
                return schedule.weekday === weekday && startsOn <= iso;
            }
            return schedule.date === iso;
        })
        .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
}

function showWeek(offsetWeeks) {
    weekStart = addDays(weekStart, offsetWeeks * 7);
    renderWeek();
}

function showThisWeek() {
    weekStart = startOfWeek(new Date());
    renderWeek();
}

function renderWeek() {
    let grid = document.getElementById("weekGrid");
    let template = document.getElementById("tripChipTemplate");
    let today = new Date();
    let weekEnd = addDays(weekStart, 6);

    // Heading: "22 - 28 September 2026"
    let sameMonth = weekStart.getMonth() === weekEnd.getMonth();
    document.getElementById("weekLabel").textContent = sameMonth
        ? weekStart.getDate() + " - " + weekEnd.getDate() + " " +
          weekEnd.toLocaleDateString(undefined, { month: "long", year: "numeric" })
        : weekStart.toLocaleDateString(undefined, { day: "numeric", month: "short" }) + " - " +
          weekEnd.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

    grid.innerHTML = "";
    let tripCount = 0;

    for (let index = 0; index < 7; index++) {
        let date = addDays(weekStart, index);
        let trips = schedulesOn(date);
        tripCount += trips.length;

        let column = document.createElement("section");
        column.className = "day-column";
        if (isSameDay(date, today)) {
            column.classList.add("today");
        }
        if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
            column.classList.add("past");
        }

        let header = document.createElement("header");
        header.className = "day-head";
        header.innerHTML = '<span class="day-name"></span><span class="day-number"></span>';
        header.querySelector('.day-name').textContent = DAY_NAMES[index];
        header.querySelector('.day-number').textContent = date.getDate();
        column.appendChild(header);

        trips.forEach(schedule => {
            let chip = template.content.cloneNode(true);
            let root = chip.querySelector('.trip-chip');

            chip.querySelector('.chip-time').textContent = formatTime(schedule.time);
            chip.querySelector('.chip-destination').textContent = schedule.destination || "Trip";
            chip.querySelector('.chip-mode').textContent = modeIcon(schedule.tripmode);
            chip.querySelector('.chip-repeat').hidden = !schedule.repeatWeekly;

            let leaveBy = chip.querySelector('.chip-leave');
            if (schedule.travelMinutes) {
                let leaveAt = scheduleTime(schedule, date) - schedule.travelMinutes * 60000;
                leaveBy.textContent = "Leave by " + formatClock(leaveAt, schedule.timezone);
                leaveBy.dataset.leaveAt = leaveAt;
                leaveBy.dataset.timezone = schedule.timezone || 0;
            } else {
                leaveBy.hidden = true;
            }

            root.addEventListener("click", () => editSchedule(schedule.id, schedule));
            chip.querySelector('.chip-delete').addEventListener("click", event => {
                event.stopPropagation();
                deleteSchedule(schedule.id, schedule);
            });

            column.appendChild(chip);
        });

        let add = document.createElement("button");
        add.type = "button";
        add.className = "day-add";
        add.title = "Add a Trip on This Day";
        add.innerHTML = '<span class="material-symbols-rounded">add</span>';
        add.addEventListener("click", () => openScheduleForm(toISODate(date)));
        column.appendChild(add);

        grid.appendChild(column);
    }

    document.getElementById("week-empty").hidden = tripCount > 0;
    startCountdowns();
}

/* ------------------------------------------------------------------ */
/* The form                                                             */
/* ------------------------------------------------------------------ */

var scheduleModal = new bootstrap.Modal(document.getElementById('id_add'));

function openScheduleForm(onDate) {
    editingScheduleId = null;
    document.getElementById('scheduleForm').reset();
    document.getElementById('dateInput').value =
        typeof onDate === "string" ? onDate : toISODate(new Date());
    document.getElementById('scheduleFormTitle').textContent = "Add Trip";
    document.getElementById('saveScheduleButton').textContent = "Save Trip";
    scheduleModal.show();
}

function closeScheduleForm() {
    scheduleModal.hide();
}

// Saved routes fill the picker, and give us a travel time so we can work out
// when to leave.
function loadRouteChoices() {
    db.collection("users").doc(currentUser.uid).collection("routes").get()
        .then(snapshot => {
            savedRoutes = [];
            let picker = document.getElementById("routePicker");
            snapshot.forEach(doc => {
                let route = doc.data();
                savedRoutes.push({ id: doc.id, data: route });

                let option = document.createElement("option");
                option.value = doc.id;
                option.textContent = route.name || ((route.start || "") + " to " + (route.end || ""));
                picker.appendChild(option);
            });
            document.getElementById("routePickerWrap").hidden = savedRoutes.length === 0;
        })
        .catch(error => console.log("Error loading routes: ", error));
}

// Picking a saved route fills in the destination and trip mode.
function applyRouteChoice() {
    let routeId = document.getElementById("routePicker").value;
    let chosen = savedRoutes.find(route => route.id === routeId);
    if (!chosen) {
        return;
    }
    document.getElementById("address").value = chosen.data.end || chosen.data.destinationaddress || "";
    document.getElementById("tripCode").value = chosen.data.mode || chosen.data.tripmode || "Drive";
}

function saveSchedule(event) {
    event.preventDefault();
    let form = document.getElementById('scheduleForm');
    if (!form.reportValidity()) {
        return;
    }

    let routeId = document.getElementById('routePicker').value;
    let chosen = savedRoutes.find(route => route.id === routeId);
    let dateValue = document.getElementById('dateInput').value;

    let details = {
        date: dateValue,
        weekday: (fromISODate(dateValue).getDay() + 6) % 7,
        repeatWeekly: document.getElementById('repeatWeekly').checked,
        time: document.getElementById('timeInput').value,
        timezone: document.getElementById('timezoneInput').value,
        note: document.getElementById('noteInput').value,
        destination: document.getElementById('address').value,
        postcode: document.getElementById('postCode').value,
        tripmode: document.getElementById('tripCode').value,
        routeId: routeId || null,
        travelMinutes: chosen && chosen.data.durationMinutes ? chosen.data.durationMinutes : null
    };

    let saving = editingScheduleId
        ? schedulesRef().doc(editingScheduleId).set(details, { merge: true })
        : schedulesRef().add(details);

    saving
        .then(() => {
            let wasEdit = !!editingScheduleId;
            editingScheduleId = null;
            form.reset();
            closeScheduleForm();
            loadSchedules();
            showToast(wasEdit ? "Trip updated." : "Trip added to your schedule.");
        })
        .catch(error => {
            console.log("Error saving schedule: ", error);
            showToast("Could not save your schedule. Please try again.", "error");
        });
}

// Open the form filled in with an existing trip.
function editSchedule(scheduleId, schedule) {
    editingScheduleId = scheduleId;
    document.getElementById('dateInput').value = schedule.date || "";
    document.getElementById('timeInput').value = schedule.time || "";
    document.getElementById('timezoneInput').value = schedule.timezone || "-8";
    document.getElementById('noteInput').value = schedule.note || "";
    document.getElementById('address').value = schedule.destination || "";
    document.getElementById('postCode').value = schedule.postcode || "";
    document.getElementById('tripCode').value = schedule.tripmode || "Drive";
    document.getElementById('routePicker').value = schedule.routeId || "";
    document.getElementById('repeatWeekly').checked = !!schedule.repeatWeekly;
    document.getElementById('scheduleFormTitle').textContent = "Edit Trip";
    document.getElementById('saveScheduleButton').textContent = "Save Changes";
    scheduleModal.show();
}

function deleteSchedule(scheduleId, schedule) {
    confirmDialog({
        title: schedule.repeatWeekly ? "Delete This Weekly Trip?" : "Delete This Trip?",
        message: schedule.repeatWeekly
            ? (schedule.destination || "Trip") + ", every week"
            : (schedule.destination || "Trip") + " on " + (schedule.date || ""),
        confirmLabel: "Delete Trip"
    }).then(confirmed => {
        if (!confirmed) {
            return;
        }
        schedulesRef().doc(scheduleId).delete()
            .then(() => {
                loadSchedules();
                showToast("Trip deleted.", "success", {
                    label: "Undo",
                    onClick: () => undoDeleteSchedule(scheduleId, schedule)
                });
            })
            .catch(error => {
                console.log("Error deleting schedule: ", error);
                showToast("Could not delete this trip.", "error");
            });
    });
}

function undoDeleteSchedule(scheduleId, schedule) {
    let restored = Object.assign({}, schedule);
    delete restored.id;

    schedulesRef().doc(scheduleId).set(restored)
        .then(() => {
            loadSchedules();
            showToast("Trip restored.");
        })
        .catch(error => {
            console.log("Error restoring schedule: ", error);
            showToast("Could not restore this trip.", "error");
        });
}

/* ------------------------------------------------------------------ */
/* Leave by countdowns                                                  */
/* ------------------------------------------------------------------ */

function startCountdowns() {
    clearInterval(countdownTimer);
    updateCountdowns();
    countdownTimer = setInterval(updateCountdowns, 30000);
}

function updateCountdowns() {
    document.querySelectorAll('.chip-leave').forEach(label => {
        let leaveAt = parseInt(label.dataset.leaveAt, 10);
        if (!leaveAt) {
            return;
        }
        let minutes = Math.round((leaveAt - Date.now()) / 60000);
        label.classList.toggle("soon", minutes <= 60 && minutes > 0);

        if (minutes > 0 && minutes <= 120) {
            label.textContent = "Leave in " + (minutes >= 60
                ? Math.floor(minutes / 60) + " h " + (minutes % 60) + " min"
                : minutes + " min");
        } else if (minutes <= 0 && minutes > -60) {
            label.textContent = "Leave now";
            label.classList.add("soon");
        } else {
            label.textContent = "Leave by " + formatClock(leaveAt, label.dataset.timezone);
        }
    });
}
