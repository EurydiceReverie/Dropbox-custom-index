// const BACKEND_URL = ''; if back-end is in separate platform / hosted in another platform input url: https://your-backend-domain.com

let rowCheckboxes = [];

document.addEventListener('DOMContentLoaded', () => {
    const selectAllCheckbox = document.getElementById('select-all');
    const selectAllCount = document.getElementById('select-all-count');
    const listViewButton = document.getElementById('listView');
    const gridViewButton = document.getElementById('gridView');
    const fileTable = document.querySelector('.file-table');
    const gridContainer = document.querySelector('.grid-container');
    const selectAllCountGrid = document.getElementById('select-all-count-grid');
    const searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', searchView);

    selectAllCheckbox.addEventListener('change', function() {
        const shouldCheck = this.checked;
        rowCheckboxes.forEach(checkbox => checkbox.checked = shouldCheck);
        updateSelectAllState();
    });

    function searchTable() {
        const searchTerm = searchInput.value.toLowerCase();
        const rows = document.querySelectorAll('.file-table tbody tr');

        rows.forEach(row => {
            const nameCell = row.querySelector('td:nth-child(2)');
            const name = nameCell.textContent.toLowerCase();
            if (name.includes(searchTerm)) {
                row.style.display = ''; 
                highlightMatches(nameCell, searchTerm);
            } else {
                row.style.display = 'none'; 
            }
        });
    }

    function searchGrid(searchTerm) {
        const gridItems = document.querySelectorAll('.grid-container .grid-item');
        gridItems.forEach(item => {
            const nameSpan = item.querySelector('span');
            if (nameSpan) {
                const name = nameSpan.textContent.toLowerCase();
                if (name.includes(searchTerm)) {
                    item.style.display = '';
                    highlightMatches(nameSpan, searchTerm); 
                } else {
                    item.style.display = 'none';
                }
            }
        });
    }

    function highlightMatches(element, searchTerm) {
        const text = element.textContent;
        const regex = new RegExp(searchTerm, 'gi');
        const highlightedText = text.replace(regex, match => `<mark style="background-color: #00FFFF;">${match}</mark>`);
        element.innerHTML = highlightedText;
    }

    function searchView() {
        const searchTerm = searchInput.value.toLowerCase();
        if (document.getElementById('listView').classList.contains('active')) {
            searchTable(searchTerm);
        } else {
            searchGrid(searchTerm);
        }
    }

    function setView(view) {
        if (view === 'grid') {
            gridViewButton.classList.add('active');
            listViewButton.classList.remove('active');
        } else {
            listViewButton.classList.add('active');
            gridViewButton.classList.remove('active');
        }
    }

    window.addEventListener('popstate', () => {
    const view = getQueryParam('view') || 'list';
    const path = decodeURIComponent(getQueryParam('path') || "");
    setView(view);
    loadData(path);
});

    async function downloadZip(filePaths) {
        const toast = document.getElementById('zip-toast');
const toastText = toast.querySelector('span');
  const dot = toast.querySelector('.dot-gathering');

toast.style.display = 'flex';
toastText.textContent = 'Zipping files...';
        dot.style.display = 'block';
    fetch(`/api/downloadZip`, {  // here if back-end is different url post here for ex: fetch(`${BACKEND_URL}/api/downloadZip`
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ paths: filePaths }),
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Zip download failed: ${response.status} ${response.statusText}`);
        }
        return response.blob();
    })
    .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'archive.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        toastText.textContent = '✅ Zip complete!';
        dot.style.display = 'none';
        setTimeout(() => toast.style.display = 'none', 2000);
    })
    .catch(error => {
        console.error('Zip download error:', error);
        //alert('Zip download failed.');
        toastText.textContent = '❌ Zip failed!';
        dot.style.display = 'none';
        setTimeout(() => toast.style.display = 'none', 2000);
    });
}

   async function handleBulkDownload(checkedItems) {
        if (checkedItems.length === 0) {
            alert("No items selected to download.");
            return;
        }
        const downloadType = prompt("Download as: (zip/individual)", "zip");

        const pathsToDownload = checkedItems.map(cb => cb.closest('tr') ? cb.closest('tr').dataset.path : cb.closest('.grid-item').dataset.path); 

        if (downloadType.toLowerCase() === 'zip') {
            downloadZip(pathsToDownload);
        } else {
            const filesToDownload = [];
            for (const path of pathsToDownload) {
                const items = await getFilesInFolder(path);
                filesToDownload.push(...items);
            }
            downloadMultipleFiles(filesToDownload);
        }
    }

    document.getElementById('bulk-download').addEventListener('click', async () => {
        await handleBulkDownload(rowCheckboxes.filter(cb => cb.checked));
    });

    document.getElementById('bulk-copy').addEventListener('click', () => {
        const checkedItems = rowCheckboxes.filter(cb => cb.checked);
        if (checkedItems.length === 0) {
            alert("No items selected to copy.");
            return;
        }
        const paths = checkedItems.map(cb => cb.closest('tr').dataset.path);
        copyToClipboard(paths.join('\n'));
    });

    async function getFilesInFolder(folderPath) {
        const response = await fetch(`/api/list?path=${folderPath}`);
        const data = await response.json();
        const files = data.filter(item => item.type === 'file').map(item => item.path_display);
        const subfolders = data.filter(item => item.type === 'folder');

        for (const subfolder of subfolders) {
            const subfolderFiles = await getFilesInFolder(subfolder.path_display);
            files.push(...subfolderFiles);
        }

        return files;
    }

    async function downloadMultipleFiles(filePaths) {
      if (filePaths.length === 0) return;

      let downloadedCount = 0;

        for (const filePath of filePaths) {
            await downloadFile(filePath);
            downloadedCount++;
        }
    }

    document.getElementById('header-download').addEventListener('click', async () => {
        await handleBulkDownload(rowCheckboxes.filter(cb => cb.checked));
    });

     document.getElementById('header-copy').addEventListener('click', () => {
        const checkedItems = rowCheckboxes.filter(cb => cb.checked);
        if (checkedItems.length === 0) {
            alert("No items selected to copy.");
            return;
        }

        const pathsToCopy = [];
        for (const checkbox of checkedItems) {
            const gridItem = checkbox.closest('.grid-item');
            pathsToCopy.push(gridItem.dataset.path);
        }

        copyToClipboard(pathsToCopy.join('\n'));
    });


    function updateSelectAllState() {
    const checkedCount = document.querySelectorAll('.row-checkbox:checked').length;
    const totalItems = rowCheckboxes.length;

    selectAllCheckbox.checked = checkedCount === totalItems;
    selectAllCheckbox.indeterminate = !selectAllCheckbox.checked && checkedCount > 0;
    selectAllCount.textContent = `${checkedCount}/${totalItems}`;
    selectAllCheckbox.classList.toggle('partially-selected', !selectAllCheckbox.checked && checkedCount > 0);
    selectAllCheckbox.classList.toggle('fully-selected', selectAllCheckbox.checked);
}

function updateSelectAllStateGrid() {
        const checkedCount = document.querySelectorAll('.grid-container .row-checkbox:checked').length;
        const totalItems = rowCheckboxes.length;

        const selectAllCheckboxGrid = document.getElementById('select-all-grid');
        
        selectAllCheckboxGrid.checked = checkedCount === totalItems;
        selectAllCheckboxGrid.indeterminate = !selectAllCheckboxGrid.checked && checkedCount > 0;
        selectAllCountGrid.textContent = `${checkedCount}/${totalItems}`;
        selectAllCheckboxGrid.classList.toggle('partially-selected', !selectAllCheckboxGrid.checked && checkedCount > 0);
        selectAllCheckboxGrid.classList.toggle('fully-selected', selectAllCheckboxGrid.checked);
    }


    function selectAllItemsGrid() {
    const selectAllCheckboxGrid = document.getElementById('select-all-grid');
    const shouldCheck = selectAllCheckboxGrid.checked;

    rowCheckboxes.forEach(checkbox => {
        const gridItem = checkbox.closest('.grid-item');
        checkbox.checked = shouldCheck;
        gridItem.style.backgroundColor = shouldCheck ? 'rgba(52, 152, 219, 0.3)' : '#2a2a2a';
    });

    updateSelectAllStateGrid();
}


const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
};

const formatSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

let currentPath = "";
let isLoading = false;

function renderView(tree, path){
        const listViewButton = document.getElementById('listView');
        const gridViewButton = document.getElementById('gridView');
const backButton = document.querySelector('.back-button'); 

    if (listViewButton.classList.contains('active')) {
        renderTable(tree, path);

    } else {
        renderGrid(tree, path);

    }

    if (path === "" && backButton) {
        backButton.remove();
    }
}

async function loadData(path = "") {
      isLoading = true;
   const loadingContainer = document.getElementById("loadingContainer");
    loadingContainer.style.display = "block";

    currentPath = path;
    const fileTableBody = document.getElementById("fileTableBody");

    setTimeout(async () => {
        const response = await fetch(`/api/list?path=${path}`);
        try {
            const data = await response.json();
           //localStorage.setItem('fileData', JSON.stringify(data));
            await renderView(data, path);
        } catch (error) {
            console.error("Error fetching data:", error);
            const tbody = document.getElementById("fileTableBody");
            tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: red;">Error loading file list: ${error.message}. Please check your network connection or Dropbox API token.</td></tr>`;
        } finally {
          isLoading = false;
        loadingContainer.style.display = "none";
        }
    }, 1300);
}

fileTable.addEventListener('change', function(event) {
    if (event.target.classList.contains('row-checkbox')) {
        updateSelectAllState();
    }
});

gridContainer.addEventListener('change', function(event) {
    if (event.target.classList.contains('row-checkbox')) {
        updateSelectAllStateGrid();
    }
});

function renderTable(tree, currentPath) {
    const tbody = document.getElementById("fileTableBody");
    tbody.innerHTML = '';
    fileTable.style.display = 'table'; 
        gridContainer.style.display = 'none'; 

    if (currentPath !== "" && tree && tree.length > 0) {
        const backRow = tbody.insertRow();
        const backCell = backRow.insertCell();
        backCell.colSpan = 5;
        const backButton = document.createElement('button');
        backButton.innerHTML = `<i class="fas fa-arrow-left"></i> Back`;
                backButton.className = "back-button"; 
                //backButton.addEventListener('click', () => loadData(""));

        backButton.addEventListener('click', () => history.back());
        backCell.appendChild(backButton);
    }

    if (tree && tree.length > 0) {
      const folderContentDiv = document.createElement('div');
        folderContentDiv.className = 'folder-content'; 
        tbody.appendChild(folderContentDiv); 
        tree.forEach(item => {
            const row = tbody.insertRow(); 
            row.dataset.path = item.path_display;
            const checkboxCell = row.insertCell();
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'row-checkbox';
            checkboxCell.appendChild(checkbox);
            checkbox.style.cursor = 'pointer';

            const nameCell = row.insertCell();
            const icon = document.createElement('i');
            icon.className = item.type === 'folder' ? 'fas fa-folder' : 'fas fa-file';
            nameCell.prepend(icon);
            nameCell.appendChild(document.createTextNode(` ${item.name}`));

            const dateCell = row.insertCell();
            dateCell.textContent = item.modified ? formatDate(item.modified) : "";

            const sizeCell = row.insertCell();
            sizeCell.textContent = item.size ? formatSize(item.size) : "";

            const actionsCell = row.insertCell();
            const downloadButton = document.createElement('button');
            downloadButton.className = 'action-btn';
            downloadButton.innerHTML = '<i class="fas fa-download"></i> Download';
                            downloadButton.addEventListener('click', () => {
                console.log("Downloading file:", item.path_display); 
                downloadFile(item.path_display);
                 });
            actionsCell.appendChild(downloadButton);

            const copyButton = document.createElement('button');
            copyButton.className = 'action-btn';
            copyButton.innerHTML = '<i class="fas fa-copy"></i> Copy';
                            copyButton.addEventListener('click', () => copyToClipboard(item.path_display));
            actionsCell.appendChild(copyButton);

            if (item.type === 'folder') {
            nameCell.className = "folder-name";
            nameCell.addEventListener('click', async () => {
                await loadData(item.path_display);
                const currentView = gridViewButton.classList.contains('active') ? 'grid' : 'list';
                    const encodedPath = encodeURIComponent(item.path_display);
                    history.pushState({ path: item.path_display }, '', `?view=${currentView}&path=${encodedPath}`); 
                    //await loadData(item.path_display);
            });

            downloadButton.addEventListener('click', async () => {
                const files = await getFilesInFolder(item.path_display);
                downloadMultipleFiles(files);
            });
        }
        });
                folderContentDiv.classList.add("expand");
                 rowCheckboxes = Array.from(document.querySelectorAll('.row-checkbox'));

            rowCheckboxes.forEach(checkbox => {
                checkbox.addEventListener('change', updateSelectAllState);
            });

            requestAnimationFrame(updateSelectAllState);
                
    } else {
        tbody.insertRow().insertCell().colSpan = 5;
        tbody.rows[0].cells[0].textContent = "No items found in this folder.";
    }
const folderContent = document.querySelector(".folder-content");
    if(folderContent) folderContent.classList.add("expand");
}

function selectAllItems() {
        const shouldCheck = selectAllCheckbox.checked;
        rowCheckboxes.forEach(checkbox => {
            const gridItem = checkbox.closest('.grid-item');
            gridItem.style.backgroundColor = shouldCheck ? 'rgba(52, 152, 219, 0.3)' : '#2a2a2a';
            checkbox.checked = shouldCheck;
        });
    }

    function updateBulkActionsVisibility() {
    const bulkActions = document.getElementById('bulk-actions');
    if (currentPath === "") {
        bulkActions.style.display = "flex"; 
    } else {
        bulkActions.style.display = "none";
    }
}

function renderGrid(tree) {
        updateBulkActionsVisibility();
        const grid = document.querySelector('.file-grid');
        grid.innerHTML = '';
        fileTable.style.display = 'none';
        gridContainer.style.display = 'block';

const existingBackButton = gridContainer.querySelector('.back-button');
if (existingBackButton) {
    existingBackButton.remove();
}

const selectAllCheckboxGrid = document.getElementById('select-all-grid');

const gridSelectControls = document.querySelector('.grid-select-controls');

if (currentPath !== "") {
    if (gridSelectControls) gridSelectControls.style.display = 'none';
} else {
    if (gridSelectControls) gridSelectControls.style.display = 'flex';
}

            if (currentPath !== "") {
                const backButton = document.createElement('button');
                backButton.innerHTML = `<i class="fas fa-arrow-left"></i> Back`;
                backButton.className = "back-button";
                                backButton.style.marginTop = "-10px";
                backButton.style.marginBottom = "10px"; 
                //backButton.addEventListener('click', () => loadData(""));
                backButton.addEventListener('click', () => history.back());
                gridContainer.insertBefore(backButton, grid); 
            }

        if (tree && tree.length > 0) {
            const topSection = document.querySelector('.top-section p');
            topSection.textContent = `${tree.length} Item(s)`;

            
            tree.forEach(item => {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.dataset.itemName = item.name;
                gridItem.dataset.path = item.path_display;

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'row-checkbox';
                            checkbox.id = `checkbox-${item.name}`;
                            checkbox.addEventListener('change', updateSelectAllState);
                            checkbox.addEventListener('click', function(event) {
    event.stopPropagation(); 
    gridItem.style.backgroundColor = this.checked ? 'rgba(52, 152, 219, 0.3)' : '#2a2a2a';
    updateSelectAllState();
});
                gridItem.appendChild(checkbox);

                const icon = document.createElement('i');
                icon.className = item.type === 'folder' ? 'fas fa-folder' : 'fas fa-file';
                gridItem.appendChild(icon);

                const nameSpan = document.createElement('span');
                nameSpan.textContent = item.name;
                gridItem.appendChild(nameSpan);

                const metaDiv = document.createElement('div');
                metaDiv.className = 'file-meta';
                metaDiv.innerHTML = `Modified: ${item.modified ? formatDate(item.modified) : ""}<br>Size: ${item.size ? formatSize(item.size) : ""}`;
                gridItem.appendChild(metaDiv);

                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'actions';
                const downloadIcon = document.createElement('i');
                downloadIcon.className = 'fas fa-download';
                //downloadIcon.addEventListener('click', () => downloadFile(item.path_display));
           // });
                actionsDiv.appendChild(downloadIcon);
                const copyIcon = document.createElement('i');
                copyIcon.className = 'fas fa-copy';
                copyIcon.addEventListener('click', () => copyToClipboard(item.path_display));
                actionsDiv.appendChild(copyIcon);
                gridItem.appendChild(actionsDiv);

                if (item.type === 'folder') {
                        gridItem.classList.add('folder');
                    gridItem.addEventListener('click', async () => {
                        await loadData(item.path_display);
                        const currentView = gridViewButton.classList.contains('active') ? 'grid' : 'list';
                    const encodedPath = encodeURIComponent(item.path_display);
                    history.pushState({ path: item.path_display }, '', `?view=${currentView}&path=${encodedPath}`);
                    //await loadData(item.path_display); 
                    });
            downloadIcon.addEventListener('click', async () => {
                const files = await getFilesInFolder(item.path_display);
                downloadMultipleFiles(files);
            });
                }
                else{
                     downloadIcon.addEventListener('click', () => downloadFile(item.path_display));
                }
                grid.appendChild(gridItem);
            });
       rowCheckboxes = Array.from(document.querySelectorAll('.grid-container .row-checkbox'));
        rowCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', updateSelectAllStateGrid);
        });
        requestAnimationFrame(updateSelectAllStateGrid);
        }
        else {
            grid.innerHTML = '<p>No items found in this folder.</p>';
        }
        if (!selectAllCheckboxGrid.hasListenerAttached) {
    selectAllCheckboxGrid.addEventListener('change', selectAllItemsGrid);
    selectAllCheckboxGrid.hasListenerAttached = true;
}
    }

    gridViewButton.addEventListener('click', () => {
        listViewButton.classList.remove('active');
        gridViewButton.classList.add('active');
        // renderGrid(JSON.parse(localStorage.getItem('fileData'))); 
        loadData(); 
    });

    listViewButton.addEventListener('click', () => {
        gridViewButton.classList.remove('active');
        listViewButton.classList.add('active');
        loadData();
    });

function downloadFile(filePath) {
    fetch(`/api/download`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ path: filePath }),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                try {
                    const errJson = JSON.parse(text);
                    if (
                        response.status === 409 &&
                        errJson?.error?.['.tag'] === 'path' &&
                        errJson?.error?.path?.['.tag'] === 'not_file'
                    ) {
                        console.warn(`🗂️ Skipping folder: ${filePath}`);
                        return;
                    }
                } catch (e) {
                    console.warn("⚠️ Non-JSON error response");
                }

                const errorMessage = `Download failed for ${filePath}: HTTP error ${response.status} - ${text}`;
                console.error(errorMessage);
                alert(errorMessage);
                throw new Error(errorMessage);
            });
        }

        const contentDisposition = response.headers.get('Content-Disposition');
        const match = /filename="(.+)"/.exec(contentDisposition || '');
        const filename = match ? match[1] : 'downloaded-file';
        console.log("📥 content-disposition:", contentDisposition);
console.log("📁 Extracted filename:", filename);

        return response.blob().then(blob => {
            console.log("🔍 Blob size:", blob.size);
            blob.text().then(t => console.log("🔍 Blob content (preview):", t.slice(0, 100)));

            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        });
    })
    .catch(error => {
        console.error('Download error:', error);
    });
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert(`Path copied to clipboard:\n${text}`);
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy path to clipboard.');
    });
}

//loadData();

const initialView = getQueryParam('view');
const initialPath = decodeURIComponent(getQueryParam('path') || "");

if (initialView === 'grid') {
    gridViewButton.classList.add('active');
    listViewButton.classList.remove('active');
} else {
    listViewButton.classList.add('active');
    gridViewButton.classList.remove('active');
}

setView(initialView);

loadData(initialPath);
});

function getQueryParam(param) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
}