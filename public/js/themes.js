// Theme picker. getTheme/setTheme come from theme.js, which runs in <head>.
function renderThemeChoice() {
    let current = getTheme();
    document.querySelectorAll('.theme-option').forEach(option => {
        let selected = option.dataset.theme === current;
        option.classList.toggle('selected', selected);
        option.setAttribute('aria-checked', selected);
    });
}

function chooseTheme(theme) {
    setTheme(theme);
    renderThemeChoice();
}

document.querySelectorAll('.theme-option').forEach(option => {
    option.addEventListener('click', () => chooseTheme(option.dataset.theme));
});

renderThemeChoice();
