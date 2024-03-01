let dag;
let path = [];

const rootId = 1;
let codeEditor = null;
let codeEditor2 = null;
let sourceLine_to_nodeID = {};
let highlightNodeID = -1;
let global_races = null;
let current_button = 0;
let targetMovementData = null;

const dataRaceButtonDiv = document.getElementById('data-race-buttons');


document.addEventListener('DOMContentLoaded', () => {
    const json_fileInput = document.getElementById('selectedFile');
    json_fileInput.addEventListener('change', handleJsonUpload);
    
    console.log(`bench is ${benchmark}`);
    if(benchmark == null){
        return;
    }

    var bench_json = benchmarks[benchmark];
    if(bench_json !=undefined){
        handleJSON(bench_json);
    }

});

function handleJSON(jsonData){
    const svgID = "#svgJSON";
    setupSVG(svgID);
    dag = prepareGraph_dagre(jsonData);
    
    targetMovementData = extractTargetMovementData(jsonData);
    visualizeDAG_dagre(dag, svgID, targetMovementData, codeEditor, codeEditor2);
    addZooming();
    addLegend();
    showBorder();

    if (global_races) {
        const firstButton = dataRaceButtonDiv.firstChild;
        firstButton.click();
    }
}

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

function handleJsonUpload(event) {
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            let jsonData = e.target.result;
            handleJSON(jsonData);
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
        if (!childNode.data.hidden && childNode.data.active) {
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

function showImmediateChildren(nodeId, g)
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

    codeEditor.on("cursorActivity", function() {
        const cursor = codeEditor.getCursor();
        const lineNumber = cursor.line + 1;

        if (highlightNodeID != -1) {
            const circle_id = "circle" + highlightNodeID;
            document.getElementById(circle_id).style.fill = get_node_color(dag.node(highlightNodeID));
            document.getElementById(circle_id).setAttribute("r", nodeRadius);
            highlightNodeID = -1;
        }

        if (!(lineNumber in sourceLine_to_nodeID)) {
            return
        }

        console.log(`line number: ${lineNumber}, node id: ${sourceLine_to_nodeID[lineNumber]}`);
        const circle_id = "circle" + sourceLine_to_nodeID[lineNumber];
        document.getElementById(circle_id).style.fill = "pink";
        document.getElementById(circle_id).setAttribute("r", nodeRadius * 2);
        highlightNodeID = sourceLine_to_nodeID[lineNumber];
    });
}

function parseFileInfoForSourceLine(fileInfo, node)
{
    let sourceLine = -1;
    const startIndex = fileInfo.indexOf('line: ');
    const endIndex = fileInfo.indexOf(',', startIndex + 1);
    sourceLine = fileInfo.substring(startIndex + "line: ".length, endIndex);

    if(sourceLine != -1 && !(sourceLine in sourceLine_to_nodeID)){
        if(node['end_event'] == event_type.target_begin){
            // target source line is usually off by 1 or 2
            let targetLine = codeEditor.getDoc().getLine(sourceLine - 1);
            while(!(targetLine.includes("target"))){
                sourceLine -= 1;
                targetLine = codeEditor.getDoc().getLine(sourceLine - 1);
            }
        }
        sourceLine_to_nodeID[sourceLine] = node['id'];
    }

    return sourceLine;
}

function parseRaceStackForSourceLine(raceStack) {
    let sourceLine = -1;
    const startColonIndex = raceStack.indexOf(':');
    const endColonIndex = raceStack.indexOf(':', startColonIndex + 1);
    sourceLine = raceStack.substring(startColonIndex + 1, endColonIndex) - 0;
    return sourceLine;
}

function dataRaceButton(raceIndex, g)
{
    let button = document.createElement('button');
    button.id = "button" + raceIndex;
    button.selected = false;

    button.textContent = "Race " + raceIndex;
    button.style = 'margin: 5px; padding: 5px; background-color: lightblue'

    const current_stack = global_races[raceIndex]['current_stack'];
    const prev_stack = global_races[raceIndex]['prev_stack'];
    const current_source_line = parseRaceStackForSourceLine(current_stack);
    const prev_source_line = parseRaceStackForSourceLine(prev_stack);

    global_races[raceIndex]['current_source_line'] = current_source_line;
    global_races[raceIndex]['prev_source_line'] = prev_source_line;

    const current_node_index = global_races[raceIndex]['current'];
    const prev_node_index = global_races[raceIndex]['prev'];

    button.onclick = (e) => {
        resetErrorLineLeft(codeEditor);
        resetErrorLineRight(codeEditor2);

        if(button.selected){
            current_button = -1;
            button.style.backgroundColor = "lightblue";
            button.selected = false;
            return;
        }
        button.selected = true;
        
        if (current_source_line != -1) {
            const errorLine = current_source_line - 1;
            codeEditor.markText({ line: errorLine, ch: 0 }, { line: errorLine + 1, ch: 0 }, { css: 'background-color: #FF6464;' });
            let t = codeEditor.charCoords({line: errorLine, ch: 0}, 'local').top;
            let middleHeight = codeEditor.getScrollerElement().offsetHeight / 2;
            codeEditor.scrollTo(null, t - middleHeight - 5);
            prevHighlightLineLeft = errorLine;
        } 
        
        if (prev_source_line != -1) {
            const errorLine = prev_source_line - 1;
            codeEditor2.markText({line: errorLine, ch: 0}, {line: errorLine + 1, ch: 0}, { css: 'background-color: #FF6464;' });
            let t = codeEditor2.charCoords({line: errorLine, ch: 0}, 'local').top;
            let middleHeight = codeEditor2.getScrollerElement().offsetHeight / 2;
            codeEditor2.scrollTo(null, t - middleHeight - 5);
            prevHighlightLineRight = errorLine;
        }

        // highlight the nodes in graph
        for (const node of g.nodes()) {
            g.node(node).data.special = false;
            g.node(node).data.hidden = true;
        }

        for (const edge of g.edges()) {
            g.edge(edge).data.hidden = true;
        }

        showNode(current_node_index, g);
        showNode(prev_node_index, g);
        showImmediateChildren(rootId,g)
        
        g.node(current_node_index).data.special = true;
        g.node(prev_node_index).data.special = true;

        visualizeDAG_dagre(g, "#svgJSON", null, codeEditor, codeEditor2)

        // highlight the button
        if(current_button != raceIndex && current_button != -1){
            document.getElementById("button" + current_button).style.backgroundColor = "lightblue";
            document.getElementById("button" + current_button).selected = false;
        }
        current_button = raceIndex;
        button.style.backgroundColor = "red";
    }
    return button;
}

function showAllButton(g){
    let button = document.createElement('button');

    button.id = "showAllButton";
    button.textContent = "Show all";
    button.style = 'margin: 5px; padding: 5px; background-color: lightyellow'

    button.onclick = (e) => {
        for(const node of g.nodes()){
            g.node(node).data.special = false;
            g.node(node).data.hidden = false;
            g.node(node).data.active = true;
        }

        for(const edge of g.edges()){
            g.edge(edge).data.hidden = false;
        }

        visualizeDAG_dagre(g, "#svgJSON", null, codeEditor, codeEditor2);
    }
    return button
}

function constructDataRaceButtons(races, g)
{
    current_button = 0;

    let showAllButtonElement = document.getElementById('showAllButton');
    if(showAllButtonElement != null){
        showAllButtonElement.remove();
    }

    document.getElementById('data-upload-region').appendChild(showAllButton(g));
    

    if (races == null) {
        return;
    }
    
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
        node['special'] = false;
        g.setNode(node.id, {data:node, ...{width: nodeRadius * 2, height: nodeRadius * 2}});
        g.node(node.id).data.refCount = 0;

        node['source_line'] = null;
        if (node['stack'].length) {
            node['source_line'] = parseFileInfoForSourceLine(node['stack'], node);
        }
    }

    for (const edge of edges) {
        edge['hidden'] = true;
        g.setEdge(edge.source, edge.target, { data:edge });
    }

    if (races)
    {
        let race = races[0];
        showNode(race.current, g);
        showNode(race.prev, g);

        showImmediateChildren(rootId, g);
        document.getElementById('race-notice').innerHTML = `You have ${races.length} data races!`;

        let seen = [];
        for (race of races)
        {
            const currentNode = g.node(race['current']);

            currentNode.data.current_source_line = parseRaceStackForSourceLine(race['current_stack']);
            currentNode.data.prev_source_line = parseRaceStackForSourceLine(race['prev_stack']);

            if (!seen.includes(race.current)) {
                showNode(race.current, g);
                showImmediateChildren(race.current, g);
                seen.push(race.current);
            }
            
            if (!seen.includes(race.prev)) {
                showNode(race.prev, g);
                showImmediateChildren(race.prev, g);
                seen.push(race.prev);
            }
        }
        showImmediateChildren(rootId, g);
    }
    else {
        showNode(rootId, g);
        g.node(rootId).data.active = false;
        document.getElementById('race-notice').innerHTML = `Congratulations, you don't have <br> any data race in the program!`;
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
const text_x = symbol_x + 3 * radius;
let current_y = symbol_x;
const step_y = 30;


function addLegend() {
    let legend_svg = d3.select("#node-legend");

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
        .attr("fill", "#858585")

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

    // {
    //     legend_svg.append("line")
    //     .attr("x1", symbol_x - radius)
    //     .attr("y1", current_y)
    //     .attr("x2", symbol_x + 2 * radius)
    //     .attr("y2", current_y)
    //     .attr("stroke", "pink")
    //     .attr('stroke-dasharray', '4')
    //     .attr('marker-end', 'url(#arrowhead)')
    //     .transition()
    //     .on('start', function repeat() {
    //       d3.active(this)
    //         .transition()
    //         .duration(16000)
    //         .ease(d3.easeLinear)
    //         .styleTween('stroke-dashoffset', function() {
    //           return d3.interpolate(960, 0);
    //         })
    //         .on('end', repeat);
    //     });

    //     legend_svg.append("text")
    //     .text("target edge")
    //     .attr("font-family", "sans-serif")
    //     .attr("text-anchor", "start")
    //     .attr("alignment-baseline", "middle")
    //     .attr("fill", "black")
    //     .attr("class", "unselectable-text")
    //     .attr("font-size", "small")
    //     .attr("x", text_x)
    //     .attr("y", current_y)

    //     current_y += step_y
    // }

    legend_svg.attr('height', current_y + 10);
}

function showBorder() {
    const svgParentDiv = document.getElementsByClassName('graph-display')[0];
    svgParentDiv.style.borderColor = 'black';

    const codeDisplayDiv = document.getElementById('source-code-wrapper');
    codeDisplayDiv.style.borderColor = 'black';

    const codeDisplayDiv2 = document.getElementById('source-code-wrapper2');
    codeDisplayDiv2.style.borderColor = 'black';
}