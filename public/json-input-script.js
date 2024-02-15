let dag;
let path = [];

const rootId = 1;
let codeEditor = null;
let codeEditor2 = null;


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

            const svgID = "#svgJSON";
            setupSVG(svgID);
            dag = prepareGraph_dagre(jsonData);
            
            const targetMovementData = extractTargetMovementData(jsonData);
            visualizeDAG_dagre(dag, svgID, targetMovementData, codeEditor);
            addZooming();
            addLegend();
            showBorder();
        };

        reader.readAsText(file);
    }
}

function extractTargetMovementData(jsonData) {
    let json = JSON.parse(jsonData);
    let target_regions = json["targets"];
    return target_regions ? target_regions : null;
}


function populateRefCount_dagre(nodeId, g) 
{
    const node = g.node(nodeId);
    if (node.data.hidden) {
        return;
    }

    if (path.includes(nodeId)) {
        return;
    }
    path.push(nodeId);

    for (const childId of g.successors(nodeId)) 
    {
        const childNode = g.node(childId);
        if (!childNode.data.hidden) {
            childNode.data.refCount += 1;
            populateRefCount_dagre(childId, g);
        }
    }
}

function showNode(nodeId, g)
{
    const node = g.node(nodeId);
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
        const originalVisibility = childNode.data.hidden;
        childNode.data.hidden = false;
        if (!childNode.data.has_race && originalVisibility && g.successors(childId).length)
            childNode.data.active = false;
    }

    for (const outEdgeId of g.outEdges(nodeId))
    {
        const outEdge = g.edge(outEdgeId);
        outEdge.data.hidden = false;
    }
}

function styleCodeEditor(initialValue)
{
    // set up the first code editor
    const sourceCodeDisplay = document.getElementById('source-code-display');
    if (codeEditor == null) {
        const editor = CodeMirror.fromTextArea(sourceCodeDisplay, {
            lineNumbers: true,
            gutter: true,
            lineWrapping: false,
            readOnly: true,
            matchBrackets: true,
            styleSelectedTest: true,
            mode: 'text/x-csrc'
        });
        editor.setSize("100%", "100%");
        codeEditor = editor;
    }
    codeEditor.getDoc().setValue(initialValue);

    // set up the second code editor
    const sourceCodeDisplay2 = document.getElementById('source-code-display2');
    if (codeEditor2 == null) {
        const editor2 = CodeMirror.fromTextArea(sourceCodeDisplay2, {
            lineNumbers: true,
            gutter: true,
            lineWrapping: false,
            readOnly: true,
            matchBrackets: true,
            styleSelectedTest: true,
            mode: 'text/x-csrc'
        });
        editor2.setSize("100%", "100%");
        codeEditor2 = editor2;
    }
    codeEditor2.getDoc().setValue(initialValue);
}

function parseFileInfoForSourceLine(fileInfo, node)
{
    let sourceLine = -1;
    if(node['has_race']){
        const startColonIndex = fileInfo.indexOf(':');
        const endColonIndex = fileInfo.indexOf(':', startColonIndex + 1);
        sourceLine = fileInfo.substring(startColonIndex + 1, endColonIndex) - 0;
    }
    else{
        const startIndex = fileInfo.indexOf('line: ');
        const endIndex = fileInfo.indexOf(',', startIndex + 1);
        sourceLine = fileInfo.substring(startIndex + "line: ".length, endIndex);
        // console.log(`node ${node['id']}, startIndex ${startIndex}, endIndex ${endIndex}, source line: ${sourceLine}`);
    }

    return sourceLine;
}


function dataRaceButton(race, g)
{
    let button = document.createElement('button');
    button.textContent = "Race " + race;
    button.style = 'margin: 5px; padding: 5px;'
    button.onclick = (e) => {
        const current_node_index = global_races[race]['current'];
        const prev_node_index = global_races[race]['prev'];
        const currentNode = dag.node(current_node_index);
        const prevNode = dag.node(prev_node_index);

        resetErrorLine(codeEditor)

        if (prevErrorLine2 != -1) {
            codeEditor2.markText({line: prevErrorLine2, ch: 0}, {line: prevErrorLine2 + 1, ch: 0}, { css: 'background-color: transparent;' });
            prevErrorLine2 = -1;
        }
        
        if (currentNode.data.source_line) {
            const errorLine = currentNode.data.source_line - 1;
            codeEditor.markText({line: errorLine, ch: 0}, {line: errorLine + 1, ch: 0}, { css: 'background-color: #FF6464;' });
            let t = codeEditor.charCoords({line: errorLine, ch: 0}, 'local').top;
            let middleHeight = codeEditor.getScrollerElement().offsetHeight / 2;
            codeEditor.scrollTo(null, t - middleHeight - 5);
            prevErrorLine = errorLine;
        } 
        
        if(prevNode.data.source_line){
            const errorLine = prevNode.data.source_line - 1;
            codeEditor2.markText({line: errorLine, ch: 0}, {line: errorLine + 1, ch: 0}, { css: 'background-color: #FF6464;' });
            let t = codeEditor2.charCoords({line: errorLine, ch: 0}, 'local').top;
            let middleHeight = codeEditor2.getScrollerElement().offsetHeight / 2;
            codeEditor2.scrollTo(null, t - middleHeight - 5);
            prevErrorLine2 = errorLine;
        }

        // highlight the nodes in graph
        for(const node of g.nodes()){
            g.node(node).data.hidden = true;
        }

        for(const edge of g.edges()){
            g.edge(edge).data.hidden = true;
        }

        showNode(current_node_index, g);
        showNode(prev_node_index, g);
        showChildren(rootId,g)
        
        visualizeDAG_dagre(g, "#svgJSON", null, codeEditor)
    }
    return button;
}

function constructDataRaceButtons(races, g)
{
    if (races == null){
        return;
    }
    const dataRaceButtonDiv = document.getElementById('data-race-buttons');
    
    for (let i = 0; i < races.length; i++) {
        dataRaceButtonDiv.appendChild(dataRaceButton(i, g));
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
        let firstValue = files[firstKey];
        styleCodeEditor(firstValue);
    }

    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();

    // Set an object for the graph label
    g.setGraph({ranker: "topo-sort", align: "UL", nodesep: nodeRadius, edgesep: nodeRadius / 1.5, ranksep: nodeRadius * 2});

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    for (const node of nodes) {
        node['hidden'] = true;
        g.setNode(node.id, {data:node, ...{width: nodeRadius*2, height: nodeRadius*2}})
        g.node(node.id).data.refCount = 0;

        node['source_line'] = null;
        if (node['stack'].length) {
            node['source_line'] = parseFileInfoForSourceLine(node['stack'], node);
        }
    }

    for (const edge of edges) {
        edge['hidden'] = true;
        g.setEdge(edge.source, edge.target, {data:edge});
    }

    if (races)
    {
        let visited = [];
        for (const race of races)
        {
            if (visited.includes(race.current)) {
                continue;
            }
            visited.push(race.current);

            showNode(race.current, g);
            // showChildren(race.current, g);

            showNode(race.prev, g);
            // showChildren(race.prev, g);
        }
        showChildren(rootId, g);
    }
    else {
        showNode(rootId, g);
        g.node(rootId).data.active = false;
    }

    for (const n of g.nodes()) {
        let node = g.node(n);
        if (node.data.id === 1)
        {
            node.data.refCount = 1;
        }
        populateRefCount_dagre(n,g);
    }

    path = [];
    global_races = races;
    constructDataRaceButtons(races, g);

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

    const codeDisplayDiv = document.getElementById('source-code-wrapper');
    codeDisplayDiv.style.borderColor = 'black';
}