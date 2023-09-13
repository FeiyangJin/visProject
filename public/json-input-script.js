document.addEventListener('DOMContentLoaded', () => {
    const json_fileInput = document.getElementById('json_fileInput');
    json_fileInput.addEventListener('change', handleJsonUpload);
});

function handleJsonUpload(event){
    const file = event.target.files[0];
    
    if (file) {
        const reader = new FileReader();

        reader.onload = function (e) {
            let jsonData = e.target.result;
            prepareGraph(jsonData)
        };

        reader.readAsText(file);
    }
}

function prepareGraph(jsonData){
    let json = JSON.parse(jsonData)
    let nodes = json['nodes']
    let edges = json['links']

    const linkdata = edges.map(edge => ({
        source: nodes.find(node => node.id === edge.source),
        target: nodes.find(node => node.id === edge.target)
    }));

    // for(const link of linkdata){
    //     console.log(link.source.id)
    //     console.log(link.target.id)
    // }

    const builder = d3.graphConnect()
        .sourceId(d => d.source.id)
        .targetId(d => d.target.id)

    const dag = builder(linkdata)
    console.log(dag)

    for(const node of dag.nodes()){
        console.log(node.data)
    }
}