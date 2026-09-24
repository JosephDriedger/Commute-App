var debugmode = false;
var addPoint;
var drawLine;
var routePlaceId1;
var routePlaceId2;
var removeLines;
//var apiKey =   ;


function callDATA(url, callback, data){
    var xmlhttp;

    // compatible with IE7+, Firefox, Chrome, Opera, Safari
    xmlhttp = new XMLHttpRequest();
    if (debugmode) {
        console.log(xmlhttp);
    }
    xmlhttp.onreadystatechange = function(){
        if (xmlhttp.readyState == 4 && xmlhttp.status == 200){
            if(typeof data !== "undefined" && typeof callback !== "undefined") {
                if (debugmode) {
                    console.log("2");
                }
                callback(xmlhttp.responseText, data);
            } else if (typeof callback!== "undefined") {
                if (debugmode) {
                    console.log("1");
                }
                callback(xmlhttp.responseText);
            } else {
                if (debugmode) {
                    console.log(xmlhttp.responseText);
                }
                return(xmlhttp.responseText);
                
            }
        }
    }
    xmlhttp.open("GET", url, true);
    xmlhttp.send();
    return(xmlhttp.responseText);
}




function loadPoint(placeId) {

	callDATA("./data/places.json", addPoint, placeId);
}

// Remove the lines and markers drawn by a previous search.
function clearMap() {
	if (!window.commuteMap) {
		return;
	}
	window.commuteMap.eachLayer(function (layer) {
		if (typeof layer.getLatLngs === "function" || typeof layer.getRadius === "function") {
			window.commuteMap.removeLayer(layer);
		}
	});
}

// Centre the map on a place from places.json and show its marker.
function focusPlace(placeId) {
	callDATA("./data/places.json", function (jsonData) {
		clearMap();
		addPoint(jsonData, placeId);

		var place = JSON.parse(jsonData)[placeId];
		if (place && window.commuteMap) {
			window.commuteMap.flyTo([place.lat, place.long], 15);
		}

		// Draw the sample route from BCIT Burnaby when we have one.
		var sampleRoutes = { "2": 1, "3": 3, "4": 5, "5": 6, "6": 7 };
		if (sampleRoutes[placeId]) {
			loadRoute(sampleRoutes[placeId]);
		}
	});
}

function createRoute(placeId1, placeId2) {
	routePlaceId1 = placeId1;
	routePlaceId2 = placeId2
	
	callDATA("./data/places.json", loadRoute);
}


function loadRoute(jsonData) {

	var routeNumber;
	
	routeNumber = parseInt(jsonData);

	// if (typeof jsonData == 'undefined') {
	// 	while(typeof routeNumber == 'undefined' || isNaN(routeNumber)) {
	// 		routeNumber = parseInt(prompt("No Route Detected, please input route id"));
	// 	}
	// } else if (typeof jsonData != "object") {
	// 	alert("a")
		
	// }

	switch(routeNumber) {
		// 1 -> 2
		case 1:
			drawPredefinedRoutes(1);
			break;
		// 1 -> 2 ALT
		case 2:
			drawPredefinedRoutes(2);
			break;
		// 1 -> 3
		case 3:
			drawPredefinedRoutes(6);
			drawPredefinedRoutes(5);
			drawPredefinedRoutes(3);
			break;
		//1 -> 4
		case 4:
			drawPredefinedRoutes(6);
			drawPredefinedRoutes(5);
			drawPredefinedRoutes(3);
			drawPredefinedRoutes(7);
			drawPredefinedRoutes(8);
			drawPredefinedRoutes(9);
			break;
		//1 -> 4 ALT
		case 5:
			drawPredefinedRoutes(1);
			drawPredefinedRoutes(12);
			drawPredefinedRoutes(9);
			break;
		// 1 -> 5
		case 6:
			drawPredefinedRoutes(1);
			drawPredefinedRoutes(11);
			drawPredefinedRoutes(10);
			break;
		// 1 -> 6
		case 7:
			drawPredefinedRoutes(6);
			break;
		// 2 -> 3
		case 8:
			drawPredefinedRoutes(3);
			drawPredefinedRoutes(4);
			break;
		// 2 -> 3 ALT
		case 9:
			drawPredefinedRoutes(3);
			drawPredefinedRoutes(5);
			drawPredefinedRoutes(6);
			drawPredefinedRoutes(1);
			break;
		// 2 -> 4
		case 10:
			drawPredefinedRoutes(7);
			drawPredefinedRoutes(8);
			drawPredefinedRoutes(9);
			break;
		// 2 -> 5
		case 11:
			drawPredefinedRoutes(11);
			drawPredefinedRoutes(10);
			break;
		// 2 -> 6
		case 12:
			drawPredefinedRoutes(1);
			drawPredefinedRoutes(6);
			break;
		// 2 -> 6 ALT
		case 13:
			drawPredefinedRoutes(2);
			drawPredefinedRoutes(6);
			break;
		// 2 -> 6 ALT 2
		case 14:
			drawPredefinedRoutes(4);
			drawPredefinedRoutes(5);
			break;
		// 3 -> 4
		case 15:
			drawPredefinedRoutes(7);
			drawPredefinedRoutes(8);
			drawPredefinedRoutes(9);
			break;
		// 3 -> 5
		case 16:
			drawPredefinedRoutes(3);
			drawPredefinedRoutes(4);
			drawPredefinedRoutes(11);
			drawPredefinedRoutes(10);
			break;
		// 3 -> 6
		case 17:
			drawPredefinedRoutes(3);
			drawPredefinedRoutes(5);
			break;
		// 4 -> 5
		case 18:
			drawPredefinedRoutes(9);
			drawPredefinedRoutes(12);
			drawPredefinedRoutes(11);
			drawPredefinedRoutes(10);
			break;
		// 4 -> 6
		case 19:
			drawPredefinedRoutes(5);
			drawPredefinedRoutes(3);
			drawPredefinedRoutes(7);
			drawPredefinedRoutes(8);
			drawPredefinedRoutes(9);
			break;
		// 5 -> 6
		case 20:
			drawPredefinedRoutes(10);
			drawPredefinedRoutes(11);
			drawPredefinedRoutes(1);
			drawPredefinedRoutes(6);
			break;



	}



}

function drawPredefinedRoutes(pRouteId) {
	var color = "#0377fc";
	var colorE = "#2300d4";
	var colorM = "#ffe100";
	var colorC = "#26edff";
	// callDATA("https://gtfs.translink.ca/v2/gtfsrealtime?apikey=" + apiKey, defineRoute);
	switch(pRouteId) {
		// MetroTown -> BCIT
		case 1:
			drawLine(49.22616, -123.00353, 49.22597, -123.00378, color);
			drawLine(49.22597, -123.00378, 49.22764, -123.00757, color);
			drawLine(49.22764, -123.00757, 49.23149, -123.00348, color);
			drawLine(49.23149, -123.00348, 49.23208, -123.00334, color);
			drawLine(49.23208, -123.00334, 49.24649, -123.00338, color);
			drawLine(49.24649, -123.00338, 49.24820, -123.00435, color);
			drawLine(49.24820, -123.00435, 49.25161, -123.00433, color);
			break;
		// MetroTown -> Bcit ALT
		case 2:
			drawLine(49.22616, -123.00353, 49.22597, -123.00378, color);
			drawLine(49.22597, -123.00378, 49.22764, -123.00757, color);
			drawLine(49.22764, -123.00757, 49.22730,-123.00795, color);
			drawLine(49.22730,-123.00795, 49.22923,-123.01216, color);
			drawLine(49.22923,-123.01216, 49.22949,-123.01265, color);
			drawLine(49.22949,-123.01265, 49.23270,-123.01260, color);
			drawLine(49.23270,-123.01260, 49.23287,-123.01105, color);
			drawLine(49.23287,-123.01105, 49.23402,-123.01111, color);
			break;
		// BCIT DTC -> Commercial Brodway
		case 3:
			drawLine(49.28308,-123.11553, 49.28026,-123.11100, colorE);
			drawLine(49.28026,-123.11100, 49.27959,-123.10963, colorE);
			drawLine(49.27959,-123.10963, 49.27794,-123.10695, colorE);
			drawLine(49.27794,-123.10695, 49.27649,-123.10262, colorE);
			drawLine(49.27649,-123.10262, 49.27360,-123.10205, colorE);
			drawLine(49.27360,-123.10205, 49.27237,-123.09728, colorE);
			drawLine(49.27237,-123.09728, 49.27237,-123.09728, colorE);
			drawLine(49.27237,-123.09728, 49.2666,-123.0785, colorE);
			drawLine(49.2666,-123.0785, 49.26185,-123.06901, colorE);
			break;
		// Commercial Brodway -> metrotown
		case 4:
			drawLine(49.26185,-123.06901, 49.25634,-123.06914, colorE);
			drawLine(49.25634,-123.06914, 49.25469,-123.06825, colorE);
			drawLine(49.25469,-123.06825, 49.25204,-123.06476, colorE);
			drawLine(49.25204,-123.06476, 49.22581,-123.00387, colorE);
			break;
		// Commercial Brodway -> Brentwood
		case 5:
			drawLine(49.26185,-123.06901,49.26302,-123.06861, colorM);
			drawLine(49.26302,-123.06861, 49.2585,-123.0571, colorM);
			drawLine(49.2585,-123.0571, 49.25776,-123.05380, colorM);
			drawLine(49.25776,-123.05380, 49.2604,-123.0341, colorM);
			drawLine(49.2604,-123.0341, 49.2623,-123.0267,colorM);
			drawLine(49.2623,-123.0267, 49.2645,-123.0139, colorM);
			drawLine(49.2645,-123.0139, 49.2665,-123.0098, colorM);
			drawLine(49.2665,-123.0098, 49.2665,-123.0022, colorM);
			break;
		// Brentwood -> BCIT
		case 6:
			drawLine(49.2665,-123.0022, 49.2666,-123.0031, color);
			drawLine(49.2666,-123.0031, 49.2616,-123.0028, color);
			drawLine(49.2616,-123.0028,49.2588,-123.0038, color);
			drawLine(49.2588,-123.0038,49.25161, -123.00433, color);
			break;
		// DT -> Brodway-city hall
		case 7:
			drawLine(49.28360,-123.11652, 49.27898,-123.12354, colorC);
			drawLine(49.27898,-123.12354, 49.27776,-123.12443, colorC);
			drawLine(49.27776,-123.12443, 49.27674,-123.12470, colorC);
			drawLine(49.27674,-123.12470, 49.27565,-123.12378, colorC);
			drawLine(49.27565,-123.12378, 49.27305,-123.11993, colorC);
			drawLine(49.27305,-123.11993, 49.26939,-123.11774, colorC);
			drawLine(49.26939,-123.11774, 49.26545,-123.11486, colorC);
			drawLine(49.26545,-123.11486, 49.26288,-123.11479, colorC);
			break;
		// Brodway-city hall -> Marine Drive
		case 8:
			drawLine(49.26288,-123.11479, 49.2454,-123.1154, colorC);
			drawLine(49.2454,-123.1154, 49.2429,-123.1184, colorC);
			drawLine(49.2429,-123.1184, 49.2405,-123.1183, colorC);
			drawLine(49.2405,-123.1183, 49.23834,-123.11602, colorC);
			drawLine(49.23834,-123.11602, 49.20966,-123.11689, colorC);
			break;
		// Marine Drive -> YVR
		case 9:
			drawLine(49.20966,-123.11689, 49.20803,-123.11733, colorC);
			drawLine(49.20803,-123.11733, 49.2001,-123.1181, colorC);
			drawLine(49.2001,-123.1181, 49.1978,-123.1207, colorC);
			drawLine(49.1978,-123.1207, 49.1945,-123.1288, colorC);
			drawLine(49.1945,-123.1288, 49.1947,-123.1310, colorC);
			drawLine(49.1947,-123.1310, 49.1956,-123.1339, colorC);
			drawLine(49.1956,-123.1339, 49.1956,-123.1339, colorC);
			drawLine(49.1956,-123.1339, 49.1962,-123.1485, colorC);
			drawLine(49.1962,-123.1485, 49.1931,-123.1555, colorC);
			drawLine(49.1931,-123.1555, 49.1931,-123.1670, colorC);
			drawLine(49.1931,-123.1670, 49.1936,-123.1720, colorC);
			drawLine(49.1936,-123.1720, 49.1937,-123.1739, colorC);
			drawLine(49.1937,-123.1739, 49.1944,-123.1785, colorC);
			break;
		// Clinten -> Royal Oak
		case 10:
			drawLine(49.21296,-122.98293, 49.21305,-122.98846, color);
			drawLine(49.21305,-122.98846, 49.21853,-122.98847, color);
			drawLine(49.21853,-122.98847, 49.21850,-122.98501, color);
			drawLine(49.21850,-122.98501, 49.21919,-122.98508, color);
			drawLine(49.21919,-122.98508, 49.21981,-122.98821, color);
			drawLine(49.21981,-122.98821, 49.22004,-122.98826, color);
			break;
		// Royal Oak -> Metrotown
		case 11:
			drawLine(49.22004,-122.98826, 49.22135,-122.99410, colorE);
			drawLine(49.22135,-122.99410, 49.22581,-123.00387, colorE);
			break;
		// Metrotown -> Marine Drive
		case 12:
			drawLine(49.22581,-123.00387, 49.22758,-123.00754, color);
			drawLine(49.22758,-123.00754, 49.22333,-123.01224, color);
			drawLine(49.22333,-123.01224, 49.22193,-123.01246, color);
			drawLine(49.22193,-123.01246, 49.22205,-123.02371, color);
			drawLine(49.22205,-123.02371, 49.22229,-123.02606, color);
			drawLine(49.22229,-123.02606, 49.22382,-123.02907, color);
			drawLine(49.22382,-123.02907, 49.2247,-123.0324, color);
			drawLine(49.2247,-123.0324, 49.22531,-123.07717, color);
			drawLine(49.22531,-123.07717, 49.22010,-123.07745, color);
			drawLine(49.22010,-123.07745, 49.21873,-123.07692, color);
			drawLine(49.21873,-123.07692, 49.21236,-123.07725, color);
			drawLine(49.21236,-123.07725, 49.21143,-123.07742, color);
			drawLine(49.21143,-123.07742, 49.21124,-123.07685, color);
			drawLine(49.21124,-123.07685, 49.21107,-123.08983, color);
			drawLine(49.21107,-123.08983, 49.2111,-123.0958, color);
			drawLine(49.2111,-123.0958, 49.2108,-123.0995, color);
			drawLine(49.2108,-123.0995, 49.2112,-123.1022, color);
			drawLine(49.2112,-123.1022, 49.2124,-123.1078, color);
			drawLine(49.2124,-123.1078, 49.2109,-123.1151, color);
			drawLine(49.2109,-123.1151, 49.20957,-123.11527, color);
			drawLine(49.20957,-123.11527, 49.20909,-123.11684, color);
			drawLine(49.20909,-123.11684, 49.20966,-123.11689, color);


	}
}