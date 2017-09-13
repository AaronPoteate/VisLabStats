var width = parseInt(d3.select("#visContainer").style("width")),
  paddingHor = 50,
  cellSize = (width - paddingHor * 2) / 53,
  paddingTop = 30,
  height = cellSize * 7 + paddingTop * 2.5;

var data,
  weekday = ["Sun", "Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"];

var year = d3.time.format("%Y"),
  month = d3.time.format("%b"),
  week = d3.time.format("%U"),
  dayOfWeek = d3.time.format("%w"),
  format = d3.time.format("%-m/%-d/%Y");

//Function to bring selected day square to front
d3.selection.prototype.moveToFront = function() {
  return this.each(function(){
    this.parentNode.appendChild(this);
  });
};

//Spinner test
var opts = {
  lines: 9, // The number of lines to draw
  length: 8, // The length of each line
  width: 5, // The line thickness
  radius: 12, // The radius of the inner circle
  corners: 0, // Corner roundness (0..1)
  rotate: 0, // The rotation offset
  direction: 1, // 1: clockwise, -1: counterclockwise
  color: '#000', // #rgb or #rrggbb or array of colors
  speed: 1.5, // Rounds per second
  trail: 60, // Afterglow percentage
  shadow: false, // Whether to render a shadow
  hwaccel: false, // Whether to use hardware acceleration
  className: 'spinner', // The CSS class to assign to the spinner
  zIndex: 2e9, // The z-index (defaults to 2000000000)
  top: '50%', // Top position relative to parent
  left: '50%' // Left position relative to parent
};
var spinner;

//Use tabletop.js to load from Google Spreadsheet
var spreadsheetUrl = "https://docs.google.com/spreadsheets/d/1vKxiHrWznMutTVxHuZ9u6Pn1UdN4TlC1jHSsYh-W4-8/pubhtml?gid=0&single=true";
$(document).ready(function() {
  var target = document.getElementById("main-content");
  spinner = new Spinner(opts).spin(target);

  init();
});

function init() {
  Tabletop.init({
    key: spreadsheetUrl,
    callback: setupEverything,
    simpleSheet: false
  });
}

//Get correct data using name from page url
var dataSource = window.location.href.slice(window.location.href.lastIndexOf("/") + 1,window.location.href.indexOf(".html"));

if (dataSource === "" || dataSource === "index") { dataSource = "VisWorld"; }

function setupEverything(spreadsheetData) {

  data = d3.nest()
    .key(function(d) { return d.Date; })
    .map(spreadsheetData[dataSource].elements
      .filter(function(d) { return d.Hours !== ""; }));

  //Set up svg's with years for datasets
  var startYear = parseInt(year(new Date(d3.keys(data)[0]))),
    endYear = parseInt(year(new Date(d3.keys(data)[d3.keys(data).length-1]))),
    years = d3.range(startYear, endYear + 1),
    endDate = new Date(d3.keys(data)[d3.keys(data).length-1]);
    endDate.setDate(endDate.getDate() + 1);
  var visSvg = d3.select("#visContainer").selectAll("svg")
    .data(years)
    .enter().append("svg")
    .attr({
      "class": "Reds",
      "width": width,
      "height": height
    })
    .append("g")
    .attr("transform", "translate(" + ((width - cellSize * 53) / 2) + "," + ((height - cellSize * 7) / 2 + paddingTop) + ")");

  //Create and position day cells in columns by week and row by day
  var rectDay = visSvg.selectAll(".day")
    .data(function(d) {
      if (d === startYear) {
        return d3.time.days(new Date(d3.keys(data)[0]), new Date(d + 1, 0, 1));
      } else if (d === endYear) {
        return d3.time.days(new Date(d, 0, 1), new Date(endDate));
      } else {
        return d3.time.days(new Date(d, 0, 1), new Date(d + 1, 0, 1));
      }
    })
    .enter().append("rect")
    .attr({
      "class": "day",
      "width": cellSize,
      "height": cellSize,
      "x": function(d) { return week(d) * cellSize; },
      "y": function(d) { return dayOfWeek(d) * cellSize; }
    })
    .datum(format);

  //Create color scale
  var color = d3.scale.quantize()
    .domain([0, 80]) //d3.mean(d3.values(data), function(d) {return parseInt(d[0].Visitors)})
    .range(d3.range(8).map(function(d) { return "q" + d + "-9"; }));

  //Filter day cells by those in dataset and color based on visitors/hour
  rectDay.filter(function(d) { return d in data; })
    .attr("class", function(d) { return data[d][0].Hours === "0" || data[d][0].Hours === "" ? "day q9-9" : "day " + color(data[d][0].Visitors / data[d][0].Hours); });

  //Add month borders
  var monthBorder = visSvg.selectAll(".month")
    .data(function(d) {
      if (d === startYear) {
        return d3.time.months(d3.time.month(new Date(d3.keys(data)[0])), new Date(d + 1, 0, 1));
      } else if (d === endYear) {
        return d3.time.months(new Date(d, 0, 1), new Date(d3.keys(data)[d3.keys(data).length-1]));
      } else {
        return d3.time.months(new Date(d, 0, 1), new Date(d + 1, 0, 1));
      }
    })
  .enter().append("path")
    .attr("class", "month")
    .attr("d", monthPath);

  //Add labels for months
  var monthAbr = d3.time.format("%b");
  visSvg.selectAll(".month-label")
    .data(function(d, i) { return monthBorder[i]; })
    .enter().append("text")
    .text(function(d) { return  monthAbr(d3.select(d).datum()); })
    .attr({
      "class": "month-label",
      "x": function(d) { return d.getBBox().x + d.getBBox().width / 2; },
      "y": -10,
      "text-anchor": "middle"
    });

  //Create and arrange y-axis text
  d3.selectAll("svg")
    .append("g")
    .attr("class", "axis").selectAll("y")
    .data(weekday)
    .enter().append("text")
    .text(function(d) { return  d; })
    .attr({
      "class": "weekday-label",
      "x": 5,
      "y": function(d,i) { return ((height - cellSize * 7) / 2  + paddingTop) + i * cellSize + cellSize/2; },
      "alignment-baseline": "middle"
    });

  //Create and arrange title for visualizations
  function yearFilter(y) {
    return d3.values(data).filter(function(d) { return year(new Date(d[0].Date)) === y; });
  }

  d3.selectAll("svg").selectAll(".year-title")
    .data(function(d) { return d3.time.years(new Date(d, 0, 1), new Date(d + 1, 0, 1)); })
    .enter().append("text")
    .text(function(d) { return year(d) + " (Total Visitors: " +
    d3.format(",")(d3.sum(yearFilter(year(d)), function(d) { return d[0].Visitors; })) + ")";
    })
    .attr({
      "class": "year-title",
      "x": width / 2,
      "y": paddingTop,
      "text-anchor": "middle"
    });

  //Create legend
  var legend = d3.select("#legend")
    .append("svg")
    .attr({
      "class": "Reds",
      "width": width,
      "height": 100
    });
  var center = parseInt(d3.select("#legend").style("width")) / 2;

  legend.selectAll("key")
    .data(color.range())
    .enter().append("rect")
    .attr({
      "class": function(d) { return d; },
      "stroke": "#000",
      "width": cellSize,
      "height": cellSize,
      "x": function(d, i) {
        return cellSize * i + center - color.range().length * cellSize / 2;
      },
      "y": (100 - cellSize) / 2
    });

  legend.append("text")
    .attr({
      "x": center,
      "y": (100 - cellSize) / 2 - cellSize / 4,
      "text-anchor": "middle"
    })
    .text("Visitors per Hour");

  legend.append("text")
    .attr({
      "x": center - cellSize * 3,
      "y": (100 - cellSize) / 2 + cellSize * 3/2 + 5,
      "text-anchor": "end"
    })
    .text("< " + color.invertExtent("q0-9")[1]);

  legend.append("text")
    .attr({
      "x": center + cellSize * 3,
      "y": (100 - cellSize) / 2 + cellSize * 3/2 + 5,
      "text-anchor": "start"
    })
    .text("> " + color.invertExtent("q7-9")[0]);

  MakeToolTip();
  spinner.stop();
}

//Create paths for months (from: http://bl.ocks.org/mbostock/4063318)
function monthPath(t0) {
  var t1 = new Date(t0.getFullYear(), t0.getMonth() + 1, 0),
      d0 = +dayOfWeek(t0), w0 = +week(t0),
      d1 = +dayOfWeek(t1), w1 = +week(t1);
  return "M" + (w0 + 1) * cellSize + "," + d0 * cellSize +
    "H" + w0 * cellSize + "V" + 7 * cellSize +
    "H" + w1 * cellSize + "V" + (d1 + 1) * cellSize +
    "H" + (w1 + 1) * cellSize + "V" + 0 +
    "H" + (w0 + 1) * cellSize + "Z";
}

//Create tooltips
function MakeToolTip() {
  var tooltip = d3.select("body")
    .append("div")
    .attr("id", "tooltip")
    .style({
      "position": "absolute",
      "visibility": "hidden"
    });

  //Fire tooltip on mouse hover over day cells
  d3.selectAll(".day").on("mouseover", function (d) {
    var thisDayActive = d3.select(this);
    if (!thisDayActive.classed("this-day-active")) {
      thisDayActive
        .classed("this-day-active", true)
        .moveToFront();
    }

    tooltip.style("visibility", "visible");
    tooltip.html(data[d][0].Hours !== "0" ?
      "<p class='text-center'><strong>" + data[d][0].Date + "</strong></p>" +
      "<p><strong>Visitors: </strong>" + data[d][0].Visitors + "</p>" +
      "<p><strong>Hours open: </strong>" + data[d][0].Hours + "</p>" +
      "<p><strong>Visitors/Hour: </strong>" +
        Math.round(data[d][0].Visitors / data[d][0].Hours * 10) / 10 +
        "</p>" +
      "<p class='text-center'><strong>" + data[d][0].Notes + "</strong></p>"
      :
      "<p class='text-center'><strong>" + data[d][0].Date + "</strong></p>" +
      "<p class='text-center'><strong>Closed</strong></p>" +
      "<p class='text-center'><strong>" + data[d][0].Notes + "</strong></p>"
    )
    .style({
      "left": window.innerWidth - d3.event.pageX < 150 ? d3.event.pageX - 150 + "px" : d3.event.pageX + 25 + "px",
      "top": window.innerHeight - d3.event.pageY > 150 ? (d3.event.pageY) + "px" : (d3.event.pageY - 150) + "px"
    });
  });

  //Fire tooltip on mouse over day of week label
  d3.selectAll(".weekday-label").on("mouseenter", function () {
    var curYear = d3.select(this.parentNode).datum(),
      curDay = d3.select(this).text();

    var weekdayYear = d3.values(data).filter(function(d) {
        return dayOfWeek(new Date(d[0].Date)) === weekday.indexOf(curDay).toString() &&
          year(new Date(d[0].Date)) === curYear.toString();
      }),
      numVis = d3.sum(weekdayYear, function(d) { return d[0].Visitors; }),
      numHours = d3.sum(weekdayYear, function(d) { return d[0].Hours; });


    tooltip.style("visibility", "visible");
    tooltip.html(
      "<p class='text-center'><strong>" +
        curDay + " in " + curYear + " (" + weekdayYear.length + ")" +
      "</strong></p>" +
      "<p><strong>Total Visitors: </strong>" +
        numVis +
      "</p>" +
      "<p><strong>Total Hours open: </strong>" +
        numHours +
      "</p>" +
      "<p><strong>Visitors/Hour: </strong>" +
        Math.round(numVis / numHours * 10) / 10 +
      "</p>" +
      "<p><strong>Total Days Closed: </strong>" +
        weekdayYear.filter(function(d) { return d[0].Hours === "0"; }).length +
      "</p>"
    )
    .style({
      "left": window.innerWidth - d3.event.pageX < 150 ?
        d3.event.pageX - 150 + "px" :
        d3.event.pageX + 25 + "px",
      "top": window.innerHeight - d3.event.pageY > 150 ?
        (d3.event.pageY) + "px" :
        (d3.event.pageY - 150) + "px"
    });
  });

  //Fire tooltip on mouse over month label
  d3.selectAll(".month-label").on("mouseover", function () {
    var curYear = d3.select(this.parentNode).datum(),
      curMonth = d3.select(this).text();

    var monthYear = d3.values(data).filter(function(d) {
        return month(new Date(d[0].Date)) === curMonth &&
          year(new Date(d[0].Date)) === curYear.toString();
      }),
      numVis = d3.sum(monthYear, function(d) { return d[0].Visitors; }),
      numHours = d3.sum(monthYear, function(d) { return d[0].Hours; });

    tooltip.style("visibility", "visible");
    tooltip.html(
      "<p class='text-center'><strong>" +
      curMonth + ", " + curYear +
      "</strong></p>" +
      "<p><strong>Total Visitors: </strong>" +
        numVis +
      "</p>" +
      "<p><strong>Total Hours open: </strong>" +
        numHours +
      "</p>" +
      "<p><strong>Visitors/Hour: </strong>" +
        Math.round(numVis / numHours * 10) / 10 +
      "</p>" +
      "<p><strong>Total Days Closed: </strong>" +
        monthYear.filter(function(d) { return d[0].Hours === "0"; }).length +
      "</p>"
    )
    .style({
      "left": window.innerWidth - d3.event.pageX < 150 ?
        d3.event.pageX - 150 + "px" :
        d3.event.pageX + 25 + "px",
      "top": window.innerHeight - d3.event.pageY > 150 ?
        (d3.event.pageY) + "px" :
        (d3.event.pageY - 150) + "px"
    });
  });

  //Remove tooltip on mouse out
  d3.selectAll(".day").on("mouseout", function () {
    d3.selectAll(".day").classed("this-day-active", false);
    d3.selectAll(".month").moveToFront();
    tooltip.style("visibility", "hidden");
  });
  d3.selectAll(".weekday-label").on("mouseout", function () {
    tooltip.style("visibility", "hidden");
  });
  d3.selectAll(".month-label").on("mouseout", function () {
    tooltip.style("visibility", "hidden");
  });
}
