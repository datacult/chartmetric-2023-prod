import { chartDimensions, trimNames } from "../utility.js";
import { drawMap } from "./2_10_map.js";

export function gradientBarMapComponent(dataset, selector) {
  let widthKey = "SPINS";
  let yKey = "TRACK_NAME";
  let imageKey = "IMAGE_URL";
  d3.select("#" + selector).html(`
  <div id="radioTopTracksMap_worldMap">
      <svg id='radioTopTracksMap_worldMap_svg'></svg>
      <div class="map-tooltip">
         
      </div>
  </div>
  
  <div id="radioTopTracksMap_gradientBar">
  
  </div>`);
  drawMap();
  let chartContainerId = "radioTopTracksMap_gradientBar";
  /***********************
   *1. Access data
   ************************/
  function draw() {
    dataset = dataset.sort((a, b) => d3.descending(a[widthKey], b[widthKey]));
    // Select the top 10 tracks
    const top10TrackNames = [...new Set(dataset.map((d) => d[yKey]))]

    const top10 = dataset.filter((d) => top10TrackNames.includes(d.TRACK_NAME));

    /***********************
     *2. Create chart dimensions
     ************************/
    // Get the element by its ID
    const visElement = document.getElementById(chartContainerId);

    const dimensions = chartDimensions(chartContainerId);

    /***********************
     *3. Set up canvas
     ************************/
    const wrapper = d3.select(visElement);

    /***********************
     *4. Create scales
     ************************/

    const top10Group = d3.groups(top10, (d) => d[yKey]);
    const top10GroupSummarized = top10Group.map(([key, values]) => ({
      [yKey]: key,
      [widthKey]: d3.sum(values, (d) => d[widthKey]),
      data: values,
    }));
    const widthScale = d3
      .scaleLinear()
      .domain([0, d3.max(top10GroupSummarized, (d) => d[widthKey])])
      .range([dimensions.boundedWidth, dimensions.boundedWidth]);

    const yScale = d3
      .scaleBand()
      .domain(top10TrackNames)
      .range([0, dimensions.boundedHeight])
      .paddingInner(0.2);

    const barContainers = wrapper.selectAll("div").data(top10GroupSummarized);
    const newElements = barContainers
      .join("div")
      .attr("class", "gradient-bar")
      .attr(
        "id",
        (d) => trimNames(d[yKey])
   
      )
      .on("click", async function (event, d) {
        d3.select("#radioTopTracksMap_worldMap_svg").selectAll("*").remove();
        drawMap(d.data.map((d) => d.NAME));
      })
      .on("mouseenter", function (event, d) {
        d3.select(this).style("border", "1px solid black");

        let tooltip = d3.select(this).append("div").attr("id", "viz_2_10_tooltip").html(`
      <div class='name'>${d.data[0].ARTIST_NAME}</div>
      <div class="flag"> </div>
     `);
        let fromRight = d3
          .select("#viz_2_10_tooltip")
          .node()
          .getBoundingClientRect().width;
        let profileBarWidth = d3
          .select(this)
          .node()
          .getBoundingClientRect().width;

        tooltip.style("left", (profileBarWidth + fromRight) + "px");

        tooltip.transition()
               .duration(500)
               .style("opacity", 1)
               .style("left", (profileBarWidth * 0.5) + "px");
      })
      .on("mouseleave", function (d) {
        d3.select(this).select("#viz_2_10_tooltip").remove();
        d3.select(this).style("border", "0px solid black");
      });

    let imageWidth = yScale.bandwidth() * 0.75;

    newElements.html(function (d) {
    
    return    `
    <img src="${d.data[0][imageKey]}" alt="${d[yKey]}" class="artist-image" 
    style=" height:100%">
    <div class="artist-name"><span>${d[yKey]}</span></div>
  `;
    });
    newElements
      .style("padding", "3px")
      .style("margin", "1px")
      .style("width", (d) => {
        return widthScale(d.data[0][widthKey]) + "px";
      })
      .attr("transform", (d, i) => `translate(0px,${yScale(d[yKey])}px)`);

   
  }
  function update(data) {
    draw(data);
  }
  update(dataset);
 
  return {
    update: update,
  };
}
