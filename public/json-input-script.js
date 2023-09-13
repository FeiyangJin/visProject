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
    let links = json['links']
    console.log(nodes)
    console.log(links)
}