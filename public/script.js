const graphml_fileInput = document.getElementById('graphml_fileInput');
const json_fileInput = document.getElementById('json_fileInput');
const graphContainer = document.getElementById('graphContainer');

graphml_fileInput.addEventListener('change', handleFileUpload);
json_fileInput.addEventListener('change', handleJsonUpload);

function handleJsonUpload(event){
    const file = event.target.files[0];
    console.log(file)

    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const jsonData = e.target.result;
            console.log(jsonData)
        };

        reader.readAsText(file);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            const graphmlData = e.target.result;
            let {nodes, edges} = prepareGraph(graphmlData)
            visualizeGraph(nodes,edges);
        };

        reader.readAsText(file);
    }
}

function prepareGraph(graphmlData){
    // Parse the GraphML data and add nodes and edges to the 'graph' object
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(graphmlData, 'application/xml');

    // Extract keys
    const keys = Array.from(xmlDoc.querySelectorAll('key')).map((key) => {
        const keyid = key.getAttribute('id')
        const keyfor = key.getAttribute('for')
        const keyname = key.getAttribute('attr.name')
        const keytype = key.getAttribute('attr.type')

        return {
            id: keyid,
            for: keyfor,
            name: keyname,
            keytype, keytype
        };
    });
    console.log(keys)

    // Extract nodes and edges from the XML data (customize based on your XML structure)
    const nodes = Array.from(xmlDoc.querySelectorAll('node')).map((node) => {
        const result = {
            id: node.getAttribute('id'),
        }

        const dataElements = Array.from(node.querySelectorAll('data'));
        // Iterate through each <data> element and extract its key and text content
        dataElements.forEach((dataElement) => {
            const key = dataElement.getAttribute('key');
            let keyName = keys.find(x => x.id === key).name
            const value = dataElement.textContent;
            result[keyName] = value;
        });
        return result;

    });
    console.log(nodes)

    const edges = Array.from(xmlDoc.querySelectorAll('edge')).map((edge) => {
        const result = {
            source: edge.getAttribute('source'),
            target: edge.getAttribute('target'),
        };

        const dataElements = Array.from(edge.querySelectorAll('data'));
        dataElements.forEach((dataElement) => {
            const key = dataElement.getAttribute('key');
            let keyName = keys.find(x => x.id === key).name
            const value = dataElement.textContent;
            result[keyName] = value;
        });
        return result;
    });
    console.log(edges)

    return {nodes,edges};
}


function visualizeGraph(nodes, edges) {
    // Visualization code using D3.js (customize as needed)
    const svg = d3.select(graphContainer)
        .append('svg')
        .attr('width', 800)
        .attr('height', 800);

    // Create links (edges) between nodes
    const links = edges.map(edge => ({
        source: nodes.find(node => node.id === edge.source),
        target: nodes.find(node => node.id === edge.target)
    }));

    // Create a D3 force simulation
    const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id))
    .force('charge', d3.forceManyBody())
    .force('center', d3.forceCenter(300, 200));

    // Create SVG elements for nodes
    const nodeElements = svg.selectAll('circle')
    .data(nodes)
    .enter()
    .append('circle')
    .attr('r', 8)
    .attr('fill', function(d) {
        if (d.has_race === '0'){
            return 'pink';
        }
        return 'orange';
    });

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

    // Create SVG elements for links (edges)
    const linkElements = svg.selectAll('line')
    .data(links)
    .enter()
    .append('line')
    .attr('stroke', 'black')
    .attr('marker-end', 'url(#arrowhead)'); // Attach arrowhead marker

    // Define a tick function to update node and link positions
    function tick() {
        linkElements
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);
    
        nodeElements
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);
    }
    
    // Update positions on each tick of the simulation
    simulation.on('tick', tick);
}

// document.addEventListener('DOMContentLoaded', () => {
//     const fileInput = document.getElementById('fileInput');
//     const json_fileInput = document.getElementById('json_fileInput');
//     const graphContainer = document.getElementById('graphContainer');

//     fileInput.addEventListener('change', handleFileUpload);
// });