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

visualizeDAG(dag);

function visualizeDAG(dag, svgID="#svg"){

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


  const svg = d3.select(svgID)
  .attr('width', width + 15)
  .attr('height', height + 15);
  const trans = svg.transition().duration(750);

  // Create SVG elements for nodes
  svg
    .select("#nodes")
    .selectAll("g")
    .data(Array.from(dag.nodes()))
    .join((enter) =>
      enter
        .append("g")
        .attr("transform", ({ x, y }) => `translate(${x}, ${y})`)
        .attr("opacity", 0)
        .call(
          (enter) => {
            enter
              .append("circle")
              .on('click', function(n){
                  console.log(`you are clicking on node ${n.data.id}`)
                  for(const child of n.children()){
                    console.log(`child id is ${child.data.id}`)
                  }
              })
              .attr("r", nodeRadius)
              .attr("fill", function(n){
                if (n.data.has_race === undefined){
                  return colorMap.get(n.data.id)
                }

                if (n.data.has_race == 0){
                  return "orange"
                }
                return "blue"

              });
            enter
              .append("text")
              .text(d => d.data.id)
              .attr("font-weight", "bold")
              .attr("font-family", "sans-serif")
              .attr("text-anchor", "middle")
              .attr("alignment-baseline", "middle")
              .attr("fill", "white")
              .attr("font-size", "xx-small");
            enter.transition(trans).attr("opacity", 1);
          },
          (exit) => {
            exit.remove()
          }
        )
    );

  // Define an arrowhead marker for directed edges
  svg.append('defs').append('marker')
  .attr('id', 'arrowhead')
  .attr('refX', 6) 
  .attr('refY', 2) 
  .attr('markerWidth', 10) 
  .attr('markerHeight', 10) 
  .attr('orient', 'auto-start-reverse') 
  .append('path')
  .attr('d', 'M 0,0 V 4 L6,2 Z');

  const lineGenerator = d3.line()
                          .x(d => d.x)
                          .y(d => d.y);

  let edges = []
  for(const link of dag.links()){
    let allpoints = []

    // Loop through the points and construct the path
    for (let i = 0; i < link.points.length; i++) {
        allpoints.push({x: link.points[i][0], y:link.points[i][1]})
    }
    const pathStringD3 = lineGenerator(allpoints)

    const result = {
      info: link,
      path: pathStringD3
    }
    
    edges.push(result)
  }

  // link paths
  svg
    .select("#links")
    .selectAll("path")
    .data(edges)
    .join(
      (enter) =>{
        enter
        .append("path")
        .attr("d", (e) => e.path)
        .attr("fill", "none")
        .attr("stroke-width", 2)
        .attr("stroke","black")
        .attr('marker-end', 'url(#arrowhead)')
        .attr("opacity", 0)
        .attr("stroke-dasharray", function(e){
          if(e.info.data === undefined){
            return "0"
          }

          if(e.info.data.edge_type === "FORK_I"
            || e.info.data.edge_type === "FORK_E"){
            return "4"
          }

          if(e.info.data.edge_type === "JOIN"
            || e.info.data.edge_type === "JOIN_E"){
          return "1,4"
        }
        })
        .call((enter) => enter.transition(trans).attr("opacity", 1))
      },
      (exit) => {
        exit.remove()
      }

    );
}