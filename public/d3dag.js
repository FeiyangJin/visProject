// set the layout functions
const nodeRadius = 15;
const nodeSize = [nodeRadius * 2, nodeRadius * 2];
// this truncates the edges so we can render arrows nicely
const shape = d3.tweakShape(nodeSize, d3.shapeEllipse);

const data = [
  {
    id: "0",
    parentIds: ["8"]
  },
  {
    id: "1",
    parentIds: []
  },
  {
    id: "2",
    parentIds: []
  },
  {
    id: "3",
    parentIds: ["11"]
  },
  {
    id: "4",
    parentIds: ["12"]
  },
  {
    id: "5",
    parentIds: ["18"]
  },
  {
    id: "6",
    parentIds: ["9", "15", "17"]
  },
  {
    id: "7",
    parentIds: ["3", "17", "20", "21"]
  },
  {
    id: "8",
    parentIds: []
  },
  {
    id: "9",
    parentIds: ["4"]
  },
  {
    id: "10",
    parentIds: ["16", "21"]
  },
  {
    id: "11",
    parentIds: ["2"]
  },
  {
    id: "12",
    parentIds: ["21"]
  },
  {
    id: "13",
    parentIds: ["4", "12"]
  },
  {
    id: "14",
    parentIds: ["1", "8"]
  },
  {
    id: "15",
    parentIds: []
  },
  {
    id: "16",
    parentIds: ["0"]
  },
  {
    id: "17",
    parentIds: ["19"]
  },
  {
    id: "18",
    parentIds: ["9"]
  },
  {
    id: "19",
    parentIds: []
  },
  {
    id: "20",
    parentIds: ["13"]
  },
  {
    id: "21",
    parentIds: []
  }
];

// create our builder and turn the raw data into a graph
const builder = d3.graphStratify();
const dag = builder(data);

// visualizeDAG(dag);

function visualizeDAG(dag){
const layout = d3.sugiyama()
    .nodeSize(nodeSize)
    .gap([nodeRadius, nodeRadius])
    .tweaks([shape]);

const { width, height } = layout(dag);

// colors
const steps = dag.nnodes() - 1;
const interp = d3.interpolateRainbow;
const colorMap = new Map(
  [...dag.nodes()]
    .sort((a, b) => a.y - b.y)
    .map((node, i) => [node.data.id, interp(i / steps)])
);

let nodes = [];
for (const node of dag.nodes()) {
  const result = {
    data: node.data,
    x: node.x,
    y: node.y
  }
  nodes.push(result)
}

// try to render the graph
const svg = d3.select("#svg")
.attr('width', width + 15)
.attr('height', height + 15);
const trans = svg.transition().duration(750);

// Create SVG elements for nodes
svg
  .select("#nodes")
  .selectAll("g")
  .data(nodes)
  .join((enter) =>
    enter
      .append("g")
      .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
      .attr("opacity", 0)
      .call(
        (enter) => {
          enter
            .append("circle")
            .attr("r", nodeRadius)
            .attr("fill", (n) => colorMap.get(n.data.id));
          enter
            .append("text")
            .text((d) => d.data.id)
            .attr("font-weight", "bold")
            .attr("font-family", "sans-serif")
            .attr("text-anchor", "middle")
            .attr("alignment-baseline", "middle")
            .attr("fill", "white");
          enter.transition(trans).attr("opacity", 1);
        },
        (exit) => {
          exit.remove()
        }
      )
  );

const lineGenerator = d3.line()
  .x(d => d.x)
  .y(d => d.y);

let links = []
for(const link of dag.links()){
  let allpoints = []

  // Loop through the points and construct the path
  for (let i = 0; i < link.points.length; i++) {
      allpoints.push({x: link.points[i][0], y:link.points[i][1]})
  }
  const pathStringD3 = lineGenerator(allpoints)

  const result = {
    sourcex: link.source.ux,
    sourcey: link.source.uy,
    targetx: link.target.ux,
    targety: link.target.uy,
    path: pathStringD3
  }
  
  links.push(result)
}


// Define an arrowhead marker for directed edges
svg.append('defs').append('marker')
.attr('id', 'arrowhead')
.attr('refX', 6) // X-coordinate position of the arrowhead
.attr('refY', 2) // Y-coordinate position of the arrowhead
.attr('markerWidth', 10) // Width of the arrowhead
.attr('markerHeight', 10) // Height of the arrowhead
.attr('orient', 'auto-start-reverse') // Automatically adjust the orientation
.append('path')
.attr('d', 'M 0,0 V 4 L6,2 Z'); // Path for the arrowhead


// link paths
svg
  .select("#links")
  .selectAll("path")
  .data(links)
  .join(
    (enter) =>{
      enter
      .append("path")
      .attr("d", (link) => link.path)
      .attr("fill", "none")
      .attr("stroke-width", 2)
      .attr("stroke","black")
      .attr('marker-end', 'url(#arrowhead)')
      .attr("opacity", 0)
      .call((enter) => enter.transition(trans).attr("opacity", 1))
    },
    (exit) => {
      exit.remove()
    }

  );
}