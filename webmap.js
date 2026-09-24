// Import the leaflet package
var L = require('leaflet');
var div = L.DomUtil.get('searchbarPlaceholder'); // this must be an ID, not class!
L.DomEvent.on(div, 'mousewheel', L.DomEvent.stopPropagation);
L.DomEvent.on(div, 'click', L.DomEvent.stopPropagation);

// Creates a leaflet map binded to an html <div> with id "map"
// setView will set the initial map view to the location at coordinates
// 13 represents the initial zoom level with higher values being more zoomed in
var map = L.map('map').setView([49.2384, -123.0144], 13);

// Adds the basemap tiles to your web map
// Additional providers are available at: https://leaflet-extras.github.io/leaflet-providers/preview/
L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
	attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
	subdomains: 'abcd',
	maxZoom: 19
}).addTo(map);

// Adds a popup marker to the webmap for GGL address
var marker1 = L.circleMarker([49.25006, -123.00202]).addTo(map)
	.bindPopup( 
		'BCIT Burnaby Campus<br>' +
		'White Ave<br>' + 
		'Vancouver, Canada<br>' +
		'V5G 3H23<br><br>' + 
		'Tel: (604) 434-5734'
	)
	.openPopup();
	


// Expose the map so the search bar and route helpers can use it
window.commuteMap = map;

//Adds point to map
addPoint = (jsonData, placeId) => {

	var metadata = JSON.parse(jsonData);
	var addmarker = L.circleMarker([metadata[placeId].lat, metadata[placeId].long])
		.bindPopup(
			metadata[placeId].name +
			'<br>' +
			metadata[placeId].address
		);
	addmarker.addTo(map);
}



drawLine = (lat1, long1, lat2, long2, color) => {
	var pointA = new L.LatLng(lat1, long1);
	var pointB = new L.LatLng(lat2, long2);
	var pointList = [pointA, pointB];
	

	var polyline = new L.Polyline(pointList, {
		color: color,
		weight: 10,
		opacity: 1,
		smoothFactor: 1
	});
	polyline.addTo(map);
	map.flyTo([49.2384, -123.0144], 14);
}




