let dag;
let path = [];

document.addEventListener('DOMContentLoaded', () => {
    const json_fileInput = document.getElementById('selectedFile');
    json_fileInput.addEventListener('change', handleJsonUpload);
});

let zoomData = 
{
    width: 0,
    height: 0
};

function addZooming() {
    const svg = document.getElementById('svgJSON');
    const parentDiv = document.getElementsByClassName('graph-display')[0];

    svg.addEventListener('wheel', event => {
        const wheelDelta = Math.sign(event.wheelDelta);

        if (wheelDelta > 0) {
            // Zoom In
            if (zoomData.width < 30 * parentDiv.clientWidth || zoomData.height < 30 * parentDiv.clientHeight) {
                zoomData.width = zoomData.width * 1.1;
                zoomData.height = zoomData.height * 1.1;
            }
        } else {
            // Zoom Out
            if (zoomData.width > parentDiv.clientWidth || zoomData.height > parentDiv.clientHeight) {
                zoomData.width = zoomData.width / 1.1;
                zoomData.height = zoomData.height / 1.1;
            }
        }
        svg.setAttribute('width', `${zoomData.width}`);
        svg.setAttribute('height', `${zoomData.height}`);
    });

    zoomData.width = svg.clientWidth;
    zoomData.height = svg.clientHeight;
    svg.setAttribute('viewBox', `0 0 ${svg.clientWidth} ${svg.clientHeight}`);
    svg.setAttribute('width', `${zoomData.width}`);
    parentDiv.scrollLeft = Math.max((svg.clientWidth - parentDiv.clientWidth) / 2, 0);

    svg.setAttribute('height', `${zoomData.height}`);
    parentDiv.scrollTop = Math.max((svg.clientHeight - parentDiv.clientWidth) / 2, 0);
}

function handleJsonUpload(event){
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            let jsonData = e.target.result;

            dag = prepareGraph_dagre(jsonData);
            const svgID = "#svgJSON";
            setupSVG(svgID);
            
            const targetMovementData = extractTargetMovementData(jsonData);
            visualizeDAG_dagre(dag, svgID, targetMovementData);
            addZooming();
            addLegend();
            showBorder();
        };

        reader.readAsText(file);
    }
}

function extractTargetMovementData(jsonData) {
    let json = JSON.parse(jsonData);
    let target_regions = json["target"];
    return target_regions ? target_regions : null;
}


function populateRefCount_dagre(nodeId, g) 
{
    if (path.includes(nodeId)) {
        return;
    }
    path.push(nodeId);

    for (const childId of g.successors(nodeId)) 
    {
        const childNode = g.node(childId);
        if (!childNode.data.hidden) {
            childNode.data.refCount++;
            populateRefCount_dagre(childId, g);
        }
    }
}

function showNode(nodeId, g)
{
    const node = g.node(nodeId);
    if (!node.data.hidden) {
        return;
    }
    node.data.hidden = false;
    for (const inEdgeId of g.inEdges(nodeId)) {
        const inEdge = g.edge(inEdgeId);
        inEdge.data.hidden = false;
    }

    for (const childId of g.predecessors(nodeId)) {
        showNode(childId, g);
    }
}

function showChildren(nodeId, g)
{
    for (const childId of g.successors(nodeId))
    {
        const childNode = g.node(childId);
        childNode.data.hidden = false;
        childNode.data.active = false;
    }

    for (const outEdgeId of g.outEdges(nodeId))
    {
        const outEdge = g.edge(outEdgeId);
        outEdge.data.hidden = false;
    }
}


function prepareGraph_dagre(jsonData){
    let json = JSON.parse(jsonData);
    let nodes = json['nodes'];
    let edges = json['edges'];
    let races = json['races'];
    let files = json['files'];

    if(files && Object.keys(files).length > 0){
        var firstKey = Object.keys(files)[0];
        const firstValue = files[firstKey];

        const formattedValue = '<pre>' + firstValue + '</pre>'; // wrap the string in <pre> tags
        d3.select("#source-code-text").html(formattedValue); // use .html() instead of .text()
    }
    else{
        d3.select("#source-code-text").html("source code will be here");
    }

    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();

    // Set an object for the graph label
    g.setGraph({ranker: "topo-sort", align: "UR", nodesep: nodeRadius, edgesep: nodeRadius / 2, ranksep: nodeRadius * 2});

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    for (const node of nodes) {
        node['hidden'] = true;
        g.setNode(node.id, {data:node, ...{width: nodeRadius*2, height: nodeRadius*2}})
        g.node(node.id).data.refCount = 0;
    }

    for (const edge of edges) {
        edge['hidden'] = true;
        g.setEdge(edge.source, edge.target, {data:edge});
    }

    if (races)
    {
        for (const race of races)
        {
            showNode(race.current, g);
            showChildren(race.current, g);
        }
    }

    for (const n of g.nodes()) {
        let node = g.node(n);
        if (node.data.id === 1)
        {
            node.data.refCount = 1;
        }
        populateRefCount_dagre(n,g);
    }

    for (const nodeId of g.nodes())
    {
        const node = g.node(nodeId);
        console.log(nodeId + ": " + node.data.refCount);
    }

    path = [];
    return g;
}


const radius = 8;
const symbol_x = 20;
const text_x = symbol_x + 4 * radius;
let current_y = symbol_x;
const step_y = 30;


function addLegend() {
    let legend_svg = d3.select("#legend");

    let existing_ele = legend_svg.select("circle");
    if (!existing_ele.empty()) {
        return;
    }

    {
        legend_svg.append("circle")
        .attr("r", radius)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "#F6D42A");

        legend_svg.append("text")
        .text("node without data race")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", 20)

        current_y += step_y
    }

    {
        legend_svg.append("circle")
        .attr("r", radius)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "red")

        legend_svg.append("circle")
        .attr("r", radius + 2)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "none")
        .attr("stroke", "blue") // Border color
        .attr("stroke-width", 1.5) // Border width
        .attr("stroke-dasharray", "2,2") // Dash pattern
        .append("animateTransform")
            .attr("attributeName","transform")
            .attr("type","rotate")
            .attr("from", `360 ${symbol_x} ${current_y}`)
            .attr("to", `0 ${symbol_x} ${current_y}`)
            .attr("dur","10s")
            .attr("repeatCount","indefinite");

        legend_svg.append("text")
        .text("node with data race")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }


    {
        legend_svg.append("circle")
        .attr("r", radius)
        .attr("cx", symbol_x)
        .attr("cy", current_y)
        .attr("fill", "black")

        legend_svg.append("text")
        .text("collapsed node")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "black")
        .attr("stroke-width", 2)

        legend_svg.append("text")
        .text("continuation edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }


    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "4")

        legend_svg.append("text")
        .text("fork edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "black")
        .attr("stroke-width", 2)
        .attr("stroke-dasharray", "1,4")

        legend_svg.append("text")
        .text("join edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

    {
        legend_svg.append("line")
        .attr("x1", symbol_x - radius)
        .attr("y1", current_y)
        .attr("x2", symbol_x + 2 * radius)
        .attr("y2", current_y)
        .attr("stroke", "pink")
        .attr("stroke-width", 4)

        legend_svg.append("text")
        .text("target edge")
        .attr("font-family", "sans-serif")
        .attr("text-anchor", "start")
        .attr("alignment-baseline", "middle")
        .attr("fill", "black")
        .attr("class", "unselectable-text")
        .attr("font-size", "small")
        .attr("x", text_x)
        .attr("y", current_y)

        current_y += step_y
    }

}

function showBorder() {
    const svgParentDiv = document.getElementsByClassName('graph-display')[0];
    svgParentDiv.style.borderColor = 'black';
}