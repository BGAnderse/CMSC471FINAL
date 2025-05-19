// =================== Imports ===================
import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";
import * as topojson from "https://cdn.jsdelivr.net/npm/topojson-client@3/+esm";
// =================== Variable Selector Logic ===================



const variableOptions = {
  "Incident Count": "incident_count",
  "Offender Age": "offender_age",
  "Offender Sex": "offender_sex",
  "Offender Race": "offender_race"
};
let currentVariable = "incident_count";

// Color scales for categorical variables
const sexColor = d3.scaleOrdinal()
  .domain(["M", "F", "U"])
  .range(["#1f77b4", "#e377c2", "#bbbbbb"]);

const raceColor = d3.scaleOrdinal()
  .domain(["W", "B", "A", "I", "U"])
  .range(["white", "black", "yellow", "brown", "pruple"]);

// Age bins and color scale
const ageBins = [
  { min: 0, max: 12, label: "0-12" },
  { min: 13, max: 17, label: "13-17" },
  { min: 18, max: 24, label: "18-24" },
  { min: 25, max: 34, label: "25-34" },
  { min: 35, max: 44, label: "35-44" },
  { min: 45, max: 54, label: "45-54" },
  { min: 55, max: 64, label: "55-64" },
  { min: 65, max: 120, label: "65+" }
];
const ageColor = d3.scaleOrdinal()
  .domain(ageBins.map(b => b.label))
  .range(d3.schemeTableau10);

// Helper to bin age
function binAge(age) {
  const n = parseInt(age, 10);
  if (isNaN(n)) return "Unknown";
  for (const bin of ageBins) {
    if (n >= bin.min && n <= bin.max) return bin.label;
  }
  return "Unknown";
}

// Helper to get most common value in array
function mostCommon(arr) {
  const counts = {};
  for (const v of arr) {
    if (v && v !== "" && v !== " " && v !== "NB" && v !== "BB") {
      const key = typeof v === "string" ? v.trim() : v;
      counts[key] = (counts[key] || 0) + 1;
    }
  }
  let max = 0, result = null;
  for (const k in counts) {
    if (counts[k] > max) {
      max = counts[k];
      result = k;
    }
  }
  return result || "Unknown";
}

// Patch aggregation to include most common for selected variable
function aggregateByCountyMonthYear(data, variable) {
  return d3.rollups(
    data,
    v => {
      const base = {
        incident_count: v.length,
        lat: v[0].lat,
        lon: v[0].lon,
        state_abbrev: v[0].state_abbrev,
        month: v[0].month,
        year: v[0].year,
        county_name: v[0].county_name,
        county_fips: v[0].county_fips
      };
      if (variable === "offender_age") {
        // Exclude age = 0 when finding most common
        const filteredAges = v.map(d => d.offender_age).filter(a => {
          const n = parseInt(a, 10);
          return !isNaN(n) && n !== 0;
        });
        base.most_common = binAge(mostCommon(filteredAges));
      } else if (variable === "offender_sex") {
        base.most_common = mostCommon(v.map(d => d.offender_sex));
      } else if (variable === "offender_race") {
        base.most_common = mostCommon(v.map(d => d.offender_race));
      }
      return base;
    },
    d => `${d.county_fips}-${d.month}-${d.year}`
  ).map(([key, value]) => ({
    county_fips: key.split("-")[0],
    month: parseInt(key.split("-")[1]),
    year: parseInt(key.split("-")[2]),
    ...value
  }));
}

// =================== DOM Elements ===================
const variableSelector = document.querySelector("#variableSelector");

// Listen for variable selector changes
if (variableSelector) {
  variableSelector.addEventListener("change", (event) => {
    const val = event.target.value;
    currentVariable = variableOptions[val] || "incident_count";
    // Re-aggregate if needed
    if (["offender_age", "offender_sex", "offender_race"].includes(currentVariable)) {
      aggregatedData = aggregateByCountyMonthYear(allData, currentVariable);
    } else {
      aggregatedData = aggregateByCountyMonthYear(allData, "incident_count");
    }
    updateMapForSelectedTime();
  });
}
// Function to update legend based on selected variable
function updateLegend(variable) {
  const legendContent = d3.select("#legendContent");
  legendContent.html(""); // Clear existing legend

  if (variable === "Incident Count") {
    legendContent.append("div")
      .style("display", "flex")
      .style("align-items", "center")
      .style("margin-bottom", "10px")
      .style("font-size", "35px")
      .html(`
        <div style="width: 30px; height: 30px; background: red; margin-right: 10px;"></div>
        <div>Incident Count (height represents count)</div>
      `);
  } 
  else if (variable === "Offender Sex") {
    ["M", "F", "U"].forEach(sex => {
      legendContent.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "10px")
        .style("font-size", "25px")
        .html(`
          <div style="width: 30px; height: 30px; background: ${sexColor(sex)}; margin-right: 10px;"></div>
          <div>${sex === "M" ? "Male" : sex === "F" ? "Female" : "Unknown"}</div>
        `);
    });
  }
  else if (variable === "Offender Race") {
    ["W", "B", "A", "I", "U"].forEach(race => {
      legendContent.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "10px")
        .style("font-size", "25px")
        .html(`
          <div style="width: 30px; height: 30px; background: ${raceColor(race)}; margin-right: 10px;"></div>
          <div>${race === "W" ? "White" : race === "B" ? "Black" : race === "A" ? "Asian" : race === "I" ? "Native American" : "Unknown"}</div>
        `);
    });
  }
  else if (variable === "Offender Age") {
    ageBins.forEach(bin => {
      legendContent.append("div")
        .style("display", "flex")
        .style("align-items", "center")
        .style("margin-bottom", "10px")
        .style("font-size", "25px")
        .html(`
          <div style="width: 30px; height: 30px; background: ${ageColor(bin.label)}; margin-right: 10px;"></div>
          <div>${bin.label} years</div>
        `);
    });
  }
}

// Update the variable selector event listener to include legend updates
if (variableSelector) {
  variableSelector.addEventListener("change", (event) => {
    const val = event.target.value;
    currentVariable = variableOptions[val] || "incident_count";
    updateLegend(val); // Update the legend when variable changes
    
    // Re-aggregate if needed
    if (["offender_age", "offender_sex", "offender_race"].includes(currentVariable)) {
      aggregatedData = aggregateByCountyMonthYear(allData, currentVariable);
    } else {
      aggregatedData = aggregateByCountyMonthYear(allData, "incident_count");
    }
    updateMapForSelectedTime();
  });
}

// Initialize legend on page load
window.onload = function() {
  document.querySelector('input[type="radio"][value="Incident Count"]').checked = true;
  updateLegend("Incident Count"); // Initialize with default legend
};
// Patch renderSpikes to use color and tooltip for selected variable
const oldRenderSpikes = renderSpikes;
renderSpikes = function(data) {
  if (!data || data.length === 0) {
    g.selectAll(".spike").transition()
      .duration(spikeAnimationDuration/2)
      .style("opacity", 0)
      .remove();
    return;
  }
  const displayData = selectedState
    ? data.filter(entry => entry.state_abbrev === selectedState)
    : data;

  if (!displayData || displayData.length === 0) {
    g.selectAll(".spike").transition()
      .duration(spikeAnimationDuration/2)
      .style("opacity", 0)
      .remove();
    return;
  }

  // Set scale domain
  if (currentVariable === "incident_count") {
    incidentScale.domain([0, d3.max(displayData, d => d.incident_count || 1)]);
  } else {
    incidentScale.domain([0, d3.max(displayData, d => d.incident_count || 1)]);
  }

  const key = d => `${d.county_fips}-${d.month}-${d.year}`;
  const spikes = g.selectAll(".spike")
    .data(displayData, key);

  spikes.exit()
    .transition()
    .duration(spikeAnimationDuration/2)
    .style("opacity", 0)
    .remove();

  const enterSpikes = spikes.enter()
    .append("path")
    .attr("class", "spike")
    .style("opacity", 0)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke", "#222").attr("stroke-width", 2);
      tooltip.transition().duration(200).style("opacity", 0.9);
      const [x, y] = d3.pointer(event, svg.node());
      tooltip.html(renderTooltip(d))
        .style("left", (x + 20) + "px")
        .style("top", (y - 20) + "px");
    })
    .on("mousemove", function(event) {
      const [x, y] = d3.pointer(event, svg.node());
      tooltip.style("left", (x + 20) + "px").style("top", (y - 20) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke", null).attr("stroke-width", null);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .each(function(d) {
      updateSingleSpike(d3.select(this), d);
    });

  // Set color based on variable
  function getColor(d) {
    if (currentVariable === "offender_sex") {
      return sexColor(d.most_common);
    }
    if (currentVariable === "offender_race") {
      return raceColor(d.most_common);
    }
    if (currentVariable === "offender_age") {
      return ageColor(d.most_common);
    }
    return "red";
  }

  enterSpikes.merge(spikes)
    .attr("fill", getColor)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("stroke", "#222").attr("stroke-width", 2);
      tooltip.transition().duration(200).style("opacity", 0.9);
      const [x, y] = d3.pointer(event, svg.node());
      tooltip.html(renderTooltip(d))
        .style("left", (x + 20) + "px")
        .style("top", (y - 20) + "px");
    })
    .on("mousemove", function(event) {
      const [x, y] = d3.pointer(event, svg.node());
      tooltip.style("left", (x + 20) + "px").style("top", (y - 20) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("stroke", null).attr("stroke-width", null);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .transition()
    .duration(spikeAnimationDuration)
    .delay((d, i) => i % 10 * 20)
    .style("opacity", 0.8)
    .attr("fill", getColor)
    .each(function(d) {
      updateSingleSpike(d3.select(this), d);
    });
};

// Tooltip rendering for each variable
function renderTooltip(d) {
  if (currentVariable === "offender_sex") {
    return `
      <div><strong>${d.county_name}, ${d.state_abbrev}</strong></div>
      <div>Incidents: ${d.incident_count || 1}</div>
      <div>Most Common Offender Sex: <b>${d.most_common || "Unknown"}</b></div>
    `;
  }
  if (currentVariable === "offender_race") {
    return `
      <div><strong>${d.county_name}, ${d.state_abbrev}</strong></div>
      <div>Incidents: ${d.incident_count || 1}</div>
      <div>Most Common Offender Race: <b>${d.most_common || "Unknown"}</b></div>
    `;
  }
  if (currentVariable === "offender_age") {
    return `
      <div><strong>${d.county_name}, ${d.state_abbrev}</strong></div>
      <div>Incidents: ${d.incident_count || 1}</div>
      <div>Most Common Offender Age: <b>${d.most_common || "Unknown"}</b></div>
    `;
  }
  // Default: incident count
  return `
    <div><strong>${d.county_name}, ${d.state_abbrev}</strong></div>
    <div>Incidents: ${d.incident_count || 1}</div>
  `;
}
console.log("map.js is running!");

// =================== Global Variables ===================
// Responsive width/height for map SVG
function getResponsiveWidth() {
  // Get the width of the main content or body, fallback to window width
  const el = document.documentElement || document.body;
  return el.clientWidth || window.innerWidth;
}
function getResponsiveHeight() {
  // Get the height of the main content or body, fallback to window height
  const el = document.documentElement || document.body;
  return el.clientHeight || window.innerHeight;
}
let width = getResponsiveWidth();
let height = getResponsiveHeight();

// Remove previous projection/path declarations
let projection = d3.geoAlbersUsa()
  .scale(width * 0.6)
  .translate([width / 2, height / 2]);
let path = d3.geoPath().projection(projection);

window.addEventListener('resize', () => {
  width = getResponsiveWidth();
  height = getResponsiveHeight();
  svg.attr("viewBox", [0, 0, width, height]);
  projection = d3.geoAlbersUsa()
    .scale(width * 0.6)
    .translate([width / 2, height / 2]);
  path = d3.geoPath().projection(projection);
  updateSpikePositions();
});

let selectedState = null;
let currentMonthNum = 1; // Default to January
let currentYear = 2013; // Default starting year
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);
// Incident scale defined globally
let incidentScale = d3.scaleLinear()
  .domain([0, 1]) // Initial domain, will be updated
  .range([0, 300]); // Increased maximum height

const zoom = d3.zoom()
  .scaleExtent([1, 8])
  .on("zoom", zoomed);

const svg = d3.create("svg")
  .attr("viewBox", [0, 0, width, height])
  .attr("style", "display: block; margin: 0 auto; position: absolute; top: 0; left: 0; transform: none; width: 100vw; height: 100vh; max-width: 100vw; max-height: 100vh; z-index: 0;")
  .on("click", reset);

// Insert SVG as the first child of <body> to ensure it is behind all UI controls
const body = document.body;
if (body.firstChild) {
  body.insertBefore(svg.node(), body.firstChild);
} else {
  body.appendChild(svg.node());
}

const g = svg.append("g");

// =================== DOM Elements ===================
const timeSlider = document.getElementById("timeSlider");
const playButton = document.getElementById("playButton");
const pauseButton = document.getElementById("pauseButton");
const resetButton = document.getElementById("resetButton");

// =================== Time Control ===================
const months2 = [];
for (let year = 2015; year <= 2016; year++) {
  for (let month = 0; month < 12; month++) {
    months2.push(`${new Date(year, month).toLocaleString('default', { month: 'long' })} ${year}`);
  }
}

// Update currentMonthNum and currentYear on slider change
if (timeSlider) {
  timeSlider.addEventListener("input", (event) => {
    const index = Math.round(event.target.value);
    const selectedTime = months2[index];
    document.getElementById("selectedTime").textContent = selectedTime;
    
    // Update current month and year
    const [monthName, yearStr] = selectedTime.split(" ");
    currentYear = parseInt(yearStr);
    timeSlider.max = months2.length - 1;
    currentMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
    
    console.log(`Selected time: Month ${currentMonthNum}, Year ${currentYear}`);
    
    // Update slider fill
    updateSliderFill();
    
    // Make sure transitions from previous rendering complete before starting new ones
    g.selectAll(".spike").interrupt();
    
    // Update map to show only data from this month/year
    updateMapForSelectedTime();
  });
}

// =================== Animation and Buttons ===================
let isPlaying = false;
let currentIndex = timeSlider ? Math.round(timeSlider.value) : 0;
const maxIndex = months2.length - 1;
const duration = 1000;
let animationFrame;
const sliderTransitionDuration = 100;
const spikeAnimationDuration = 100;

function updateSliderFill() {
  if (!timeSlider) return;
  const percent = (timeSlider.value / timeSlider.max) * 100;
  timeSlider.style.background = `linear-gradient(to right, #6b0000 ${percent}%, #ddd ${percent}%)`;
}

function animateSlider(from, to, callback) {
  if (!timeSlider) return;
  
  const startTime = Date.now();
  const animate = () => {
    const currentTime = Date.now();
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / sliderTransitionDuration, 1);
    
    const easeProgress = progress < 0.5 
      ? 4 * progress * progress * progress 
      : 1 - Math.pow(-2 * progress + 2, 3) / 2;
    
    const currentValue = from + (to - from) * easeProgress;
    timeSlider.value = currentValue;
    updateSliderFill();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      timeSlider.value = to;
      updateSliderFill();
      if (callback) callback();
    }
  };
  
  requestAnimationFrame(animate);
}

function updateSingleSpike(spike, data) {
  if (!data.lat || !data.lon) return;
  
  const [x, y] = projection([data.lon, data.lat]);
  if (!x || !y) return;
  
  const height = incidentScale(data.incident_count || 1);
  const yShifted = y-height;
  const xShifted = x;
  // Make spikes skinnier by reducing the multiplier
  const spikeWidth = Math.max(2, width * 0.003); // Skinnier spikes
  
  spike.attr("d", 
    `M${xShifted},${yShifted} L${xShifted - spikeWidth},${yShifted + height} L${xShifted + spikeWidth},${yShifted + height} Z`
  );
}

function updateSpikePositions() {
  g.selectAll(".spike").each(function() {
    const spike = d3.select(this);
    const data = spike.datum();
    updateSingleSpike(spike, data);
  });
}

function animateToNext() {
  if (!isPlaying || currentIndex >= maxIndex) {
    if (currentIndex >= maxIndex) {
      currentIndex = 0;
      animateSlider(maxIndex, 0, () => {
        if (isPlaying) {
          const selectedTime = months2[currentIndex];
          document.getElementById("selectedTime").textContent = selectedTime;
          
          const [monthName, yearStr] = selectedTime.split(" ");
          currentYear = parseInt(yearStr);
          currentMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
          
          updateMapForSelectedTime();
          setTimeout(() => animateToNext(), 500);
        }
      });
    }
    return;
  }

  const start = currentIndex;
  const end = currentIndex + 1;
  
  animateSlider(start, end, () => {
    currentIndex = end;
    const selectedTime = months2[currentIndex];
    document.getElementById("selectedTime").textContent = selectedTime;
    
    const [monthName, yearStr] = selectedTime.split(" ");
    currentYear = parseInt(yearStr);
    currentMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
    
    g.selectAll(".spike").interrupt();
    updateMapForSelectedTime();
    
    if (isPlaying) {
      setTimeout(() => animateToNext(), 800);
    }
  });
}

function startAnimation() {
  if (isPlaying) return;
  isPlaying = true;
  animateToNext();
}

function stopAnimation() {
  isPlaying = false;
  cancelAnimationFrame(animationFrame);
}

function resetSlider() {
  if (!timeSlider) return;
  
  stopAnimation();
  const startValue = parseInt(timeSlider.min);
  animateSlider(parseInt(timeSlider.value), startValue, () => {
    const selectedTime = months2[0];
    document.getElementById("selectedTime").textContent = selectedTime;
    
    const [monthName, yearStr] = selectedTime.split(" ");
    currentYear = parseInt(yearStr);
    currentMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
    
    updateMapForSelectedTime();
  });
}

// Setup button event listeners
if (playButton) playButton.addEventListener("click", startAnimation);
if (pauseButton) pauseButton.addEventListener("click", stopAnimation);
if (resetButton) {
  resetButton.addEventListener("click", () => {
    isPlaying = false;
    cancelAnimationFrame(animationFrame);
    
    const startValue = parseInt(timeSlider.min);
    animateSlider(parseInt(timeSlider.value), startValue, () => {
      currentIndex = 0;
      const selectedTime = months2[0];
      document.getElementById("selectedTime").textContent = selectedTime;
      
      const [monthName, yearStr] = selectedTime.split(" ");
      currentYear = parseInt(yearStr);
      currentMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
      
      updateMapForSelectedTime();
      reset();
    });
  });
}

// =================== Map Setup ===================
let aggregatedData = [];
let allData = [];
let dataUrl;
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
  // Local development: use local file path
  dataUrl = "data/final_data_geodata.csv";
} else {
  // On GitHub Pages or remote: use raw GitHub URL
  dataUrl = "https://raw.githubusercontent.com/BGAnderse/CMSC471FINAL/blob/main/data/Final_Data_GeoData.csv";
}
fetch(dataUrl)
  .then(response => response.text())
  .then(data => {
    const rows = d3.csvParse(data);
    console.log("First 5 raw rows:", rows.slice(0, 5)); // Log first 5 raw rows

    const formattedData = rows.map(row => {
      const numMonth = parseInt(row.month_of_offense, 10);
      const numYear = parseInt(row.year, 10); // Using the Year column from your headers
      
      if (isNaN(numMonth)) {
        console.warn("Invalid month:", row.month_of_offense, "in row:", row);
        return null;
      }
      
      if (isNaN(numYear)) {
        console.warn("Invalid year:", row.year, "in row:", row);
        return null;
      }

      // Parse coordinates - note the exact column names from your headers
      const lat = parseFloat(row['GeoData.results.geometry.lat']);
      const lon = parseFloat(row['GeoData.results.geometry.lng']);
      
      if (isNaN(lat)) {
        console.warn("Missing/invalid latitude in row:", row);
        return null;
      }
      
      if (isNaN(lon)) {
        console.warn("Missing/invalid longitude in row:", row);
        return null;
      }

      const dataPoint = {
        year: numYear,
        month: numMonth,
        state_abbrev: row.state_abbrev,
        county_name: row.county_name,
        county_fips: row.county_fips,
        lat: lat,
        lon: lon,
        incident_count: 1,
        // Include all available fields
        offender_age: row.offender_age,
        offender_sex: row.offender_sex,
        offender_race: row.offender_race,
        offender_circumstance: row.offender_circumstance,
        circumstance_label: row.circumstance_label,
        fips_state: row.fips_state,
        fips_county: row.fips_county,
        raw_data: row // Include entire original row for debugging
      };

      return dataPoint;
    }).filter(d => d !== null);
    
    console.log(`Successfully loaded ${formattedData.length} valid data points`);
    console.log("Complete dataset sample (first 10):", formattedData.slice(0, 10));
    console.log("All data points:", formattedData); // This will show ALL data
    
    allData = formattedData;
    
    aggregatedData = d3.rollups(
      formattedData,
      v => ({
        incident_count: v.length,
        lat: v[0].lat,
        lon: v[0].lon,
        state_abbrev: v[0].state_abbrev,
        month: v[0].month,
        year: v[0].year,
        county_name: v[0].county_name,
        // Include other fields you might need for tooltips
        offender_sex: v[0].offender_sex,
        offender_race: v[0].offender_race,
        circumstance_label: v[0].circumstance_label
      }),
      d => `${d.county_fips}-${d.month}-${d.year}`
    ).map(([key, value]) => ({
      county_fips: key.split("-")[0],
      month: parseInt(key.split("-")[1]),
      year: parseInt(key.split("-")[2]),
      ...value
    }));
    
    console.log("Aggregated data sample:", aggregatedData.slice(0, 5));
    console.log("Complete aggregated data:", aggregatedData); // Log all aggregated data
    
    updateMapForSelectedTime();
  })
  .catch(error => {
    console.error("Error loading or processing data:", error);
  });

function updateMapForSelectedTime() {
  console.log(`Filtering data for Month: ${currentMonthNum}, Year: ${currentYear}`);
  
  const filteredData = aggregatedData.filter(d => 
    d.month === currentMonthNum && d.year === currentYear
  );
  
  console.log(`Found ${filteredData.length} incidents for the selected time`);
  
  if (filteredData.length > 0) {
    console.log("Sample data point:", filteredData[0]);
  }
  
  renderSpikes(filteredData);
}

function renderSpikes(data) {
  if (!data || data.length === 0) {
    console.log("No data to render spikes");
    g.selectAll(".spike").transition()
      .duration(spikeAnimationDuration/2)
      .style("opacity", 0)
      .remove();
    return;
  }
  
  const displayData = selectedState
    ? data.filter(entry => entry.state_abbrev === selectedState)
    : data;
    
  if (!displayData || displayData.length === 0) {
    console.log("No data to display after filtering");
    g.selectAll(".spike").transition()
      .duration(spikeAnimationDuration/2)
      .style("opacity", 0)
      .remove();
    return;
  }

  console.log(`Rendering ${displayData.length} data points`);

  // Update scale domain
  incidentScale.domain([0, d3.max(displayData, d => d.incident_count || 1)]);
  
  const key = d => `${d.county_fips}-${d.month}-${d.year}`;
  
  // Join data pattern
  const spikes = g.selectAll(".spike")
    .data(displayData, key);
    
  // Remove exiting spikes
  spikes.exit()
    .transition()
    .duration(spikeAnimationDuration/2)
    .style("opacity", 0)
    .remove();

  // Create new spikes
  const enterSpikes = spikes.enter()
    .append("path")
    .attr("class", "spike")
    .attr("fill", "red")
    .style("opacity", 0)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "orange");
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      const [x, y] = d3.pointer(event, svg.node());
      tooltip.html(`
        <div><strong>${d.county_name}, ${d.state_abbrev}</strong></div>
        <div>Incidents: ${d.incident_count || 1}</div>
        
      `)
      .style("left", (x + 20) + "px")
      .style("top", (y - 20) + "px");
    })
    .on("mousemove", function(event) {
      const [x, y] = d3.pointer(event, svg.node());
      tooltip
        .style("left", (x + 20) + "px")
        .style("top", (y - 20) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "red");
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    })
    .each(function(d) {
      updateSingleSpike(d3.select(this), d);
    });

  // Update all spikes (new and existing)
  enterSpikes.merge(spikes)
    .on("mouseover", function(event, d) {
      d3.select(this).attr("fill", "orange");
      tooltip.transition()
        .duration(200)
        .style("opacity", 0.9);
      
      const [x, y] = d3.pointer(event, svg.node());
      tooltip.html(`
        <div><strong>${d.county_name},  ${d.state_abbrev || 'Unknown State'}</strong></div>
        <div>Incidents: ${d.incident_count || 1}</div>
      
      `)
      .style("left", (x + 20) + "px")
      .style("top", (y - 20) + "px");
    })
    .on("mousemove", function(event) {
      const [x, y] = d3.pointer(event, svg.node());
      tooltip
        .style("left", (x + 20) + "px")
        .style("top", (y - 20) + "px");
    })
    .on("mouseout", function() {
      d3.select(this).attr("fill", "red");
      tooltip.transition()
        .duration(500)
        .style("opacity", 0);
    })
    .transition()
    .duration(spikeAnimationDuration)
    .delay((d, i) => i % 10 * 20)
    .style("opacity", 0.8)
    .each(function(d) {
      updateSingleSpike(d3.select(this), d);
    });
}

fetch("https://cdn.jsdelivr.net/npm/us-atlas@3/counties-10m.json")
  .then(response => response.json())
  .then(us => {
    const statesGeo = topojson.feature(us, us.objects.states).features;
    const countiesGeo = topojson.feature(us, us.objects.counties).features;

    const states = g.append("g")
      .attr("fill", "#444")
      .attr("cursor", "pointer")
      .selectAll("path")
      .data(statesGeo)
      .join("path")
      .on("click", clicked)
      .attr("d", path);

    states.append("title").text(d => d.properties.name);

    g.append("path")
      .attr("fill", "none")
      .attr("stroke", "white")
      .attr("stroke-linejoin", "round")
      .attr("d", path(topojson.mesh(us, us.objects.states, (a, b) => a !== b)));

    svg.call(zoom);
    document.body.appendChild(svg.node());

    updateMapForSelectedTime();
    window.allCounties = countiesGeo;
  })
  .catch(error => {
    console.error("Error loading map data:", error);
  });

// =================== Interactions ===================
function reset() {
  g.selectAll("path").transition().style("fill", null);
  svg.transition().duration(750).call(zoom.transform, d3.zoomIdentity);
  selectedState = null;
  console.log("Reset to show all states");
  g.selectAll(".county").remove(); 
  updateMapForSelectedTime();
}

function zoomed(event) {
  const { transform } = event;
  g.attr("transform", transform);
  g.attr("stroke-width", 1 / transform.k);
  updateSpikePositions();
}


function clicked(event, d) {
  const [[x0, y0], [x1, y1]] = path.bounds(d);
  const stateInfo = d.properties.name;
  
  console.log("Selected state:", stateInfo);
  
  updateMapForSelectedTime();

  event.stopPropagation();
  g.selectAll("path").transition().style("fill", null);
  d3.select(this).transition().style("fill", "#614041");

  svg.transition().duration(750).call(
    zoom.transform,
    d3.zoomIdentity
      .translate(width / 2, height / 2)
      .scale(Math.min(8, 0.9 / Math.max((x1 - x0) / width, (y1 - y0) / height)))
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2),
    d3.pointer(event, svg.node())
  ).on("end", () => {
    // Update spike positions after zoom completes
    updateSpikePositions();
  });

  d3.select("#escHelp").style("opacity", 1);

  d3.select("#stateName").text(d.properties.name);

  // Show counties
  g.selectAll(".county").remove();
  const selectedId = d.id;
  const counties = window.allCounties.filter(c => Math.floor(c.id / 1000) === +selectedId);

  g.append("g")
    .attr("class", "county")
    .selectAll("path")
    .data(counties)
    .join("path")
    .attr("fill", "none")
    .attr("stroke", "white")
    .attr("stroke-width", 0.5)
    .attr("d", path);
}

// Initialize slider
if (timeSlider) {
  updateSliderFill();
  
  timeSlider.addEventListener("input", (event) => {
    const index = Math.round(event.target.value);
    updateSliderFill();
    
    if (index !== currentIndex) {
      currentIndex = index;
      const selectedTime = months2[index];
      document.getElementById("selectedTime").textContent = selectedTime;
      
      const [monthName, yearStr] = selectedTime.split(" ");
      currentYear = parseInt(yearStr);
      currentMonthNum = new Date(`${monthName} 1, ${yearStr}`).getMonth() + 1;
      
      g.selectAll(".spike").interrupt();
      updateMapForSelectedTime();
    }
  });
  
  const initialIndex = Math.round(timeSlider.value);
  const initialTime = months2[initialIndex];
  document.getElementById("selectedTime").textContent = initialTime;
  const [initialMonth, initialYear] = initialTime.split(" ");
  currentYear = parseInt(initialYear);
  currentMonthNum = new Date(`${initialMonth} 1, ${initialYear}`).getMonth() + 1;
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    reset();
    d3.select("#escHelp").style("opacity", 0);
  }
});
