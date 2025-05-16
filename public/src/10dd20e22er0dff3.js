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

  document.getElementById("listView").addEventListener("click", function () {
  this.classList.add("active");
  document.getElementById("gridView").classList.remove("active");
});

document.getElementById("gridView").addEventListener("click", function () {
  this.classList.add("active");
  document.getElementById("listView").classList.remove("active");
});

document.getElementById('header-download').addEventListener('click', () => {
    const checkedItems = rowCheckboxes.filter(cb => cb.checked);
    if (checkedItems.length === 0) {
        alert("No items selected to download.");
        return;
    }
    checkedItems.forEach(cb => {
        const itemPath = cb.closest('tr')?.dataset.path || cb.closest('.grid-item')?.dataset.path;
        if (itemPath) downloadFile(itemPath);
    });
});

document.getElementById('header-copy').addEventListener('click', () => {
    const checkedItems = rowCheckboxes.filter(cb => cb.checked);
    if (checkedItems.length === 0) {
        alert("No items selected to copy.");
        return;
    }
    const paths = checkedItems.map(cb => cb.closest('tr')?.dataset.path || cb.closest('.grid-item')?.dataset.path);
    copyToClipboard(paths.join('\n'));
});
