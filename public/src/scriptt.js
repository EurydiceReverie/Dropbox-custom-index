const image = document.querySelector('.header-image');
    const kk = document.querySelector('.kk');
    const drives = document.querySelectorAll('.drive');
    const textTargets = [kk, ...drives];
    const glowTargets = [image, ...textTargets];

    function addGlow() {
      image.style.animation = 'smoothGlowImage 1.2s ease-in-out infinite alternate';
      textTargets.forEach(el => {
        el.style.animation = 'smoothGlow 1.2s ease-in-out infinite alternate';
        el.style.cursor = 'pointer';
      });
    }

    function removeGlow() {
      image.style.animation = 'none';
      textTargets.forEach(el => {
        el.style.animation = 'none';
      });
    }

    glowTargets.forEach(el => {
      el.addEventListener('mouseenter', addGlow);
      el.addEventListener('mouseleave', removeGlow);
      el.addEventListener('click', () => {
        window.location.href = '/';
      });
    });

    document.addEventListener('keydown', function (e) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault(); 
    const searchBox = document.getElementById('searchInput');
    if (searchBox) {
      searchBox.focus();
      searchBox.select(); 
    }
  }
});

const uploadModeToggle = document.getElementById('uploadModeToggle');
const uploadModeLabel = document.getElementById('uploadModeLabel');

const fileInputLabel = document.querySelector('label[for="fileUpload"]');
const progressBarContainer = document.getElementById('progressBarContainer');
    const progressBarFill = document.getElementById('progressBarFill');
    const uploadStatus = document.getElementById('uploadStatus');
    const uploadMessage = document.getElementById('uploadMessage');


uploadModeToggle.addEventListener('change', () => {
  const folderMode = uploadModeToggle.checked;
  uploadModeLabel.textContent = folderMode ? 'Folder Upload' : 'File Upload';

  const oldInput = document.getElementById('fileUpload');
  const newInput = document.createElement('input');
  newInput.type = 'file';
  newInput.id = 'fileUpload';
  newInput.multiple = true;
  newInput.hidden = true;

  if (folderMode) newInput.setAttribute('webkitdirectory', '');

  oldInput.replaceWith(newInput);
  window.fileInput = newInput;

  fileInputLabel.setAttribute('for', 'fileUpload');

  const uploadPrompt = document.getElementById('uploadPrompt');
  uploadPrompt.textContent = folderMode
    ? 'Drag & drop a folder here or click to select a folder'
    : 'Drag & drop files here or click to select files';

  newInput.addEventListener('change', () => {
    const newFiles = Array.from(newInput.files);
    newFiles.forEach(newFile => {
      const exists = selectedFiles.some(f =>
        f.name === newFile.name &&
        f.size === newFile.size &&
        f.lastModified === newFile.lastModified
      );
      if (!exists) selectedFiles.push(newFile);
    });

    renderPreview();
    toggleUploadButton();

    newInput.value = '';
  });
});

const fileInput = document.getElementById('fileUpload');
const uploadPreview = document.getElementById('uploadPreview');
const uploadBtn = document.getElementById('uploadBtn');

let selectedFiles = [];

fileInput.addEventListener('change', () => {
  const newFiles = Array.from(fileInput.files);
  newFiles.forEach(newFile => {
    const exists = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size && f.lastModified === newFile.lastModified);
    if (!exists) {
      selectedFiles.push(newFile);
    }
  });
  renderPreview();
  toggleUploadButton();
  fileInput.value = ''; 
});

function removePreviewItem(index) {
  const item = uploadPreview.children[index];
  if (!item) return;

  item.classList.add('removing');

  setTimeout(() => {
    selectedFiles.splice(index, 1); 
    renderPreview(); 
    toggleUploadButton();
  }, 300); 
}

function renderPreview() {
  uploadPreview.innerHTML = '';
  selectedFiles.forEach((file, index) => {
    const div = document.createElement('div');
    div.className = 'preview-item';
    div.textContent = file.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    removeBtn.innerHTML = '&times;';
    removeBtn.addEventListener('click', () => removePreviewItem(index));

    div.appendChild(removeBtn);
    div.style.position = 'relative'; 
    uploadPreview.appendChild(div);
  });
}

function toggleUploadButton() {
  uploadBtn.disabled = selectedFiles.length === 0;
}

function showUploadMessage(msg, duration = 10000) {
  uploadMessage.textContent = msg;
  uploadMessage.classList.remove('hidden');
  uploadMessage.classList.add('show');

  setTimeout(() => {
    uploadMessage.classList.remove('show');
    setTimeout(() => {
      uploadMessage.classList.add('hidden');
    }, 300);
  }, duration);
}

uploadBtn.addEventListener('click', async () => {
  if (selectedFiles.length === 0) return;

  uploadMessage.textContent = '';  
  uploadBtn.disabled = true;
  uploadBtn.textContent = 'Uploading...';
  progressBarContainer.style.display = 'block';
  progressBarFill.style.width = '0%';
  uploadStatus.textContent = `Uploading 0/${selectedFiles.length}`;

  let uploadedCount = 0;
  let folderName = '';

  if (uploadModeToggle.checked && selectedFiles.length > 0) {
    const firstFilePath = selectedFiles[0].webkitRelativePath || '';
    if (firstFilePath) {
      const parts = firstFilePath.split('/');
      if (parts.length > 1) {
        folderName = parts[0];
      }
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  try {
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      console.log(`Uploading file ${i + 1} / ${selectedFiles.length}: ${file.name}`);

      const formData = new FormData();
      formData.append('files', file, file.name);

      const res = await fetch(`/api/upload?folderName=${encodeURIComponent(folderName)}`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload of ${file.name} failed: ${await res.text()}`);
      }

      uploadedCount++;
      const progress = (uploadedCount / selectedFiles.length) * 100;
      progressBarFill.style.width = `${progress}%`;
      uploadStatus.textContent = `Uploading ${uploadedCount}/${selectedFiles.length}`;
      console.log(`Progress: ${progress}%`);

      await sleep(100); 
    }

    //alert('Upload complete!');

    showUploadMessage('✅ Upload complete!');

    selectedFiles = [];
    renderPreview();
    toggleUploadButton();

  } catch (err) {
    alert('Upload failed: ' + err.message);
    showUploadMessage('❌ Upload failed: ' + err.message, 10000);
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = 'Upload Files';
    progressBarContainer.style.display = 'none';
  }
});

const dropzone = document.querySelector('.upload-dropzone');

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault(); 
  dropzone.style.borderColor = '#1e40af'; 
  dropzone.style.backgroundColor = '#e0e7ff'; 
});

dropzone.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = ''; 
  dropzone.style.backgroundColor = '';
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.style.borderColor = '';
  dropzone.style.backgroundColor = '';

  const folderMode = uploadModeToggle.checked;
  const items = e.dataTransfer.items;

  if (folderMode && items) {
    const traverseDirectory = (item, path = '') => {
      if (item.isFile) {
        item.file(file => {
          file.relativePath = path + file.name;
          const exists = selectedFiles.some(f =>
            f.name === file.name &&
            f.size === file.size &&
            f.lastModified === file.lastModified
          );
          if (!exists) {
            selectedFiles.push(file);
            renderPreview();
            toggleUploadButton();
          }
        });
      } else if (item.isDirectory) {
        const dirReader = item.createReader();
        dirReader.readEntries(entries => {
          for (let entry of entries) {
            traverseDirectory(entry, path + item.name + '/');
          }
        });
      }
    };

    for (let i = 0; i < items.length; i++) {
      const item = items[i].webkitGetAsEntry?.();
      if (item) traverseDirectory(item);
    }
  } else {
    const files = Array.from(e.dataTransfer.files);
    files.forEach(newFile => {
      const exists = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size && f.lastModified === newFile.lastModified);
      if (!exists) {
        selectedFiles.push(newFile);
      }
    });
    renderPreview();
    toggleUploadButton();
  }
});
