// © 2023 Data Culture
// Released under the ISC license.
// https://studio.datacult.com/ 

import { trimNames } from "./utility.js";

export function cluster(data, map, options, svg) {

  ////////////////////////////////////////
  /////////////// Defaults ///////////////
  ////////////////////////////////////////

  let mapping = {
    selector: '#vis',
    size: null,
    fill: null,
    stroke: null,
    group: null,
    label: null,
    value: null,
  }

  // merge default mapping with user mapping
  map = { ...mapping, ...map };

  let defaults = {
    width: 800,
    height: 800,
    margin: { top: 100, right: 100, bottom: 100, left: 100 },
    transition: 1000,
    delay: 100,
    padding: 0.05,
    size: 10,
    fill: "#69b3a2",
    stroke: "#000",
    text: "black",
    format: (d) => d3.format(".2f")(d),
    force: 1
  }

  // merge default options with user options
  options = { ...defaults, ...options };


  ////////////////////////////////////////
  ////////////// SVG Setup ///////////////
  ////////////////////////////////////////

  if (svg == null) {

    const div = d3.select(options.selector);

    const container = div.append('div')
      .classed('vis-svg-container', true);

    svg = container.append('svg')
      .attr('width', '100%') // Responsive width
      .attr('height', '100%') // Responsive height
      .attr('viewBox', `0 0 ${options.width} ${options.height}`)
      .classed('vis-svg', true)
      .append('g')
      .attr('transform', `translate(${options.margin.left},${options.margin.top})`);
  }

  ////////////////////////////////////////
  ////////////// Helpers /////////////////
  ////////////////////////////////////////

  const height = options.height - options.margin.top - options.margin.bottom;
  const width = options.width - options.margin.left - options.margin.right;

  ////////////////////////////////////////
  ////////////// Gradients ///////////////
  ////////////////////////////////////////

  let defs = svg.append("defs");

  //Filter for the outside glow
  var filter = defs.append("filter")
    .attr("id", "blur")
    .attr("x", "-50%")
    .attr("y", "-50%")
    .attr("height", "200%")
    .attr("width", "200%")
  filter.append("feGaussianBlur")
    .attr("stdDeviation", "20")
    .attr("result", "coloredBlur");

  // add color gradients
  let fillValues = data.map(d => d[map.fill])

  const colorScale = d3
    .scaleSequential()
    .domain([1, fillValues.length + 1])
    .interpolator(d3.interpolateRainbow);

  fillValues.forEach((d, i) => {

    let gradient = defs.append("linearGradient")
      .attr("id", trimNames(d))
      .attr("x1", "0%")
      .attr("x2", "0%")
      .attr("y1", "0%")
      .attr("y2", "100%");

    gradient.append("stop")
      .attr("offset", "0%")
      .style("stop-color", colorScale(i + 2))
      .style("stop-opacity", 1);

    gradient.append("stop")
      .attr("offset", "100%")
      .style("stop-color", colorScale(i + 1))
      .style("stop-opacity", 1);
  })

  ////////////////////////////////////////
  ////////////// Scales //////////////////
  ////////////////////////////////////////

  const sizeScale = d3.scaleLinear()
    .domain(d3.extent(data, d => map.size != null ? d[map.size] : options.size))
    .range([options.width * 0.05, options.width * 0.3])

  ////////////////////////////////////////
  ////////////// Simulation //////////////
  ////////////////////////////////////////

  // initial positions
  data.forEach(d => {
    d.x = width / 2;
    d.y = height / 2;
    d.r = map.size != null ? sizeScale(d[map.size]) : sizeScale(options.size);
  });

  const simulation = d3.forceSimulation()
    .force('charge', d3.forceManyBody().strength(options.force))
    .force('x', d3.forceX().strength(options.force).x(width / 2))
    .force('y', d3.forceY().strength(options.force).y(height / 2))
    .force("collision", d3.forceCollide().radius(d => d.r))
    .on("tick", ticked);

  const drag = simulation => {

    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(options.force).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {

      d.fx = Math.max(d.r, Math.min(width - d.r, event.x));
      d.fy = Math.max(d.r, Math.min(height - d.r, event.y));
    }

    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  }

  function ticked() {
    bubbles
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)

    rings
      .attr("cx", d => d.x)
      .attr("cy", d => d.y)

    labels
      .attr("transform", d => `translate(${d.x},${d.y})`)

  }

  ////////////////////////////////////////
  ////////////// DOM Setup ///////////////
  ////////////////////////////////////////


  const bubbles = svg.selectAll("circle")
    .data(data)
    .join("circle")
    .attr("r", 0)
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("fill", d => map.fill != null ? `url(#${trimNames(d[map.fill])})` : options.fill)
    .attr("fill-opacity", 0.8)
    .attr("stroke", d => d[map.stroke] || options.stroke)
    .style("filter", "url(#blur)")
    .call(drag(simulation));

  const rings = svg.selectAll(".ring")
    .data(data)
    .join("circle")
    .attr("cx", width / 2)
    .attr("cy", height / 2)
    .attr("r", 0)
    .attr("fill", d => "none")
    .attr("stroke", d => map.stroke != null ? d[map.stroke] : options.stroke)
    .attr("stroke-opacity", 0.5)
    .classed("ring", true);

  const labels = svg.selectAll("text")
    .data(data)
    .join("text")
    .attr("text-anchor", "middle")
    .attr("fill", options.text)
    .attr("font-size", d => d3.max([sizeScale(d[map.size]) / 3, 20]))
    .text(d => map.size != null ? options.format(d[map.value]) : "")
    .attr("transform", d => `translate(${width / 2},${height / 2})`)
    .attr("opacity", 0)
    .attr("pointer-events", "none");

  const value_labels = labels
    .append("tspan")
    .attr("x", 0)
    .attr("dy", "1.2em")
    .attr("font-size", d => d3.max([sizeScale(d[map.size]) / 6, 15]))
    .text(d => map.label != null ? d[map.label] : 0);

    simulation.nodes(data);

  ////////////////////////////////////////
  ////////////// Update //////////////////
  ////////////////////////////////////////

  function update(newData = data, newMap = map, newOptions = options) {

    // merge any new mapping and options
    map = { ...map, ...newMap };
    options = { ...options, ...newOptions };

    if (newData != null) data = newData;

    const t = d3.transition().duration(options.transition);

    // update scales
    sizeScale
      .domain(d3.extent(data, d => map.size != null ? d[map.size] : options.size))

    bubbles
      .data(data)
      .transition(t)
      .attrTween("r", d => {
        const i = d3.interpolate(0, d.r);
        return t => d.r = i(t);
      })
      .attr("fill", d => map.fill != null ? `url(#${trimNames(d[map.fill])})` : options.fill)
      .attr("stroke", d => d[map.stroke] || options.stroke)

    rings
      .data(data)
      .transition(t)
      .attr("r", d => d.r)
      .attr("stroke", d => map.stroke != null ? d[map.stroke] : options.stroke)

    labels
      .data(data)
      .transition(t)
      .delay(options.transition / 2)
      .attr("opacity", 1);

    simulation.restart()

  }

  // call for initial bar render
  update(data)

  return {
    update: update,
  }

};