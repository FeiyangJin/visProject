let dag;
let path = [];

let codeEditors = [];

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
            visualizeDAG_dagre(dag, svgID, targetMovementData, codeEditors);
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


function populateRefCount_dagre(n,g) 
{
    if (path.includes(n)) {
        return;
    }
    path.push(n);

    for (const child of g.successors(n)) 
    {
        g.node(child).data.refCount++;
        populateRefCount_dagre(child,g);
    }
}

function styleCodeEditors(initialValue)
{
    const currentSourceCodeDisplayWrapper = document.getElementById('current-source-code-wrapper');
    const prevSourceCodeDisplayWrapper = document.getElementById('prev-source-code-wrapper');

    const currentSourceCodeDisplay = document.getElementById('current-source-code-display');
    const prevSourceCodeDisplay = document.getElementById('prev-source-code-display');

    const currentEditor = CodeMirror.fromTextArea(currentSourceCodeDisplay, {
            lineNumbers: true,
            gutter: true,
            lineWrapping: false,
            readOnly: true,
            matchBrackets: true,
            styleSelectedTest: false,
            mode: 'text/x-csrc'
    });
    currentEditor.setSize(currentSourceCodeDisplayWrapper.clientWidth, currentSourceCodeDisplayWrapper.clientHeight);

    const prevEditor = CodeMirror.fromTextArea(prevSourceCodeDisplay, {
            lineNumbers: true,
            gutter: true,
            lineWrapping: false,
            readOnly: true,
            matchBrackets: true,
            styleSelectedTest: false,
            mode: 'text/x-csrc'
    });
    prevEditor.setSize(prevSourceCodeDisplayWrapper.clientWidth, prevSourceCodeDisplayWrapper.clientHeight);

    currentEditor.getDoc().setValue(initialValue);
    prevEditor.getDoc().setValue(initialValue);

    codeEditors.push(currentEditor);
    codeEditors.push(prevEditor);
}

function parseFileInfoForSourceLine(fileInfo)
{
    const startColonIndex = fileInfo.indexOf(':');
    const endColonIndex = fileInfo.indexOf(':', startColonIndex + 1);
    const sourceLine = fileInfo.substring(startColonIndex + 1, endColonIndex) - 0;
    return sourceLine;
}

function dataRaceButton(race)
{
    let button = document.createElement('button');
    button.textContent = "Node " + race;
    button.style = 'margin: 5px; padding: 5px;'
    button.onclick = (e) => { 
        const node = dag.node(race);
        const leftSourceCodeDisplay = codeEditors[0];
        const rightSourceCodeDisplay = codeEditors[1];

        if (prevLeftErrorLine != -1) {
            leftSourceCodeDisplay.markText({line: prevLeftErrorLine, ch: 0}, {line: prevLeftErrorLine + 1, ch: 0}, { css: 'background-color: transparent;' });
            prevLeftErrorLine = -1;
        }

        if (prevRightErrorLine != -1) {
            rightSourceCodeDisplay.markText({line: prevRightErrorLine, ch: 0}, {line: prevRightErrorLine + 1, ch: 0}, { css: 'background-color: transparent;' });
            prevRightErrorLine = -1;
        }
        
        let selectionNotice = d3.select('#selection-notice');
        if (node.data.source_line) {
            const leftErrorLine = node.data.source_line - 1;
            leftSourceCodeDisplay.markText({line: leftErrorLine, ch: 0}, {line: leftErrorLine + 1, ch: 0}, { css: 'background-color: #FF6464;' });
            let t = leftSourceCodeDisplay.charCoords({line: leftErrorLine, ch: 0}, 'local').top;
            let middleHeight = leftSourceCodeDisplay.getScrollerElement().offsetHeight / 2;
            leftSourceCodeDisplay.scrollTo(null, t - middleHeight - 5);
            prevLeftErrorLine = leftErrorLine;

            
            if (node.data.prev_source_line) {
                const rightErrorLine = node.data.prev_source_line - 1;
                rightSourceCodeDisplay.markText({line: rightErrorLine, ch: 0}, {line: rightErrorLine + 1, ch: 0}, { css: 'background-color: #FF6464;' });
                let t = rightSourceCodeDisplay.charCoords({line: rightErrorLine, ch: 0}, 'local').top;
                let middleHeight = rightSourceCodeDisplay.getScrollerElement().offsetHeight / 2;
                rightSourceCodeDisplay.scrollTo(null, t - middleHeight - 5);
                prevRightErrorLine = rightErrorLine;
            }

            selectionNotice.html(`Offending lines corresponding to node ${race} highlighted in red.`)
        } else {
            selectionNotice.html(`The selected node ${race} has no associated stack information`);
        }
    }
    return button;
}

function constructDataRaceButtons(races)
{
    const dataRaceButtonDiv = document.getElementById('data-race-buttons');
    dataRaceButtonDiv.innerHTML = '';
    let seen = [];
    for (const race of races)
    {
        if (seen.indexOf(race['current']) == -1) {
            dataRaceButtonDiv.appendChild(dataRaceButton(race['current']));
            seen.push(race['current']);
        }

        if (seen.indexOf(race['prev']) == -1) {
            dataRaceButtonDiv.appendChild(dataRaceButton(race['prev']));
            seen.push(race['prev']);
        }
    }
}

function prepareGraph_dagre(jsonData) {
    let json = JSON.parse(jsonData);
    let nodes = json['nodes'];
    let edges = json['edges'];
    let races = json['races'];
    let files = json['files'];

    let firstValue = null;
    if (files && Object.keys(files).length > 0) {
        var firstKey = Object.keys(files)[0];
        firstValue = files[firstKey];
        styleCodeEditors(firstValue);
    } else {
        styleCodeEditors(firstvalue);
    }

    // Create a new directed graph 
    var g = new dagre.graphlib.Graph();

    // Set an object for the graph label
    g.setGraph({ranker: "topo-sort", align: "UR", nodesep: nodeRadius, edgesep: nodeRadius / 2, ranksep: nodeRadius * 2});

    // Default to assigning a new object as a label for each new edge.
    g.setDefaultEdgeLabel(function() { return {}; });

    for (const node of nodes) {
        g.setNode(node.id, {data:node, ...{width: nodeRadius * 2, height: nodeRadius * 2}})
        g.node(node.id).data.refCount = 0;
        if (node['has_race']) {
            if (node['stack'].length) {
                node['source_line'] = parseFileInfoForSourceLine(node['stack']);
            } else {
                node['source_line'] = null;
            }
            node['prev_source_line'] = null;
        }
    }

    for (const race of races) {
        const current = race['current'];
        const previous = race['prev'];

        const currentNode = g.node(current);
        const previousNode = g.node(previous);

        currentNode.data['prev_source_line'] = previousNode.data.source_line;
    }

    for (const edge of edges) {
        g.setEdge(edge.source, edge.target, {data:edge})
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

    constructDataRaceButtons(races);
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

    const codeDisplayDivs = document.getElementsByClassName('source-code-wrapper');
    for (const codeDisplayDiv of codeDisplayDivs) {
        codeDisplayDiv.style.borderColor = 'black';
    }
}