document.addEventListener('DOMContentLoaded', () => {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    const controls = document.getElementById('controls');
    const fileNameDisplay = document.getElementById('fileName');
    const removeBtn = document.getElementById('removeBtn');
    const qualitySlider = document.getElementById('qualitySlider');
    const qualityValue = document.getElementById('qualityValue');
    const compressBtn = document.getElementById('compressBtn');

    // Stats Elements
    const statsContainer = document.getElementById('statsContainer');
    const originalSizeElem = document.getElementById('originalSize');
    const compressedSizeElem = document.getElementById('compressedSize');
    const savingBadge = document.getElementById('savingBadge');

    let currentFile = null;

    // Helper: Format Bytes
    function formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    // Handle File Selection
    uploadArea.addEventListener('click', () => {
        if (!currentFile) {
            fileInput.click();
        }
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFile(e.target.files[0]);
        }
    });

    // Drag and Drop
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        uploadArea.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        uploadArea.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        uploadArea.classList.add('dragover');
    }

    function unhighlight() {
        uploadArea.classList.remove('dragover');
    }

    uploadArea.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (files.length > 0) {
            handleFile(files[0]);
        }
    });

    function handleFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            alert('Please upload an image file (JPEG, PNG, WebP, etc.)');
            return;
        }

        currentFile = file;
        fileNameDisplay.textContent = file.name;

        // Update stats
        originalSizeElem.textContent = formatBytes(file.size);
        compressedSizeElem.textContent = '--';
        savingBadge.textContent = 'Ready to compress';
        statsContainer.classList.add('hidden'); // Hide until compressed if preferred, or show original now.
        // Actually, user wants to see "Original Size ... -> Compressed Size". 
        // Showing Original immediately is good.
        statsContainer.classList.remove('hidden');
        document.querySelector('.stat-divider').style.opacity = '0.2';
        document.querySelector('.stat-badges').style.display = 'none';

        // UI Transition
        uploadArea.style.display = 'none';
        controls.classList.remove('hidden');
    }

    // Remove File
    removeBtn.addEventListener('click', () => {
        currentFile = null;
        fileInput.value = '';
        controls.classList.add('hidden');
        uploadArea.style.display = 'block';
        statsContainer.classList.add('hidden');
    });

    // Slider Update
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = `${e.target.value}%`;
    });

    // Compress & Download
    compressBtn.addEventListener('click', async () => {
        if (!currentFile) return;

        const originalBtnText = compressBtn.innerHTML;
        compressBtn.innerHTML = '<span class="material-icons-round spinning">sync</span> Compressing...';
        compressBtn.disabled = true;

        // Reset stats
        compressedSizeElem.textContent = '--';

        const formData = new FormData();
        formData.append('image', currentFile);
        formData.append('quality', qualitySlider.value);

        try {
            const response = await fetch('/compress', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Compression failed');
            }

            const blob = await response.blob();

            // Update Stats
            compressedSizeElem.textContent = formatBytes(blob.size);
            document.querySelector('.stat-divider').style.opacity = '1';

            const savedBytes = currentFile.size - blob.size;
            const savedPercent = ((savedBytes / currentFile.size) * 100).toFixed(0);

            document.querySelector('.stat-badges').style.display = 'flex';
            if (savedBytes > 0) {
                savingBadge.textContent = `${savedPercent}% Saved`;
                savingBadge.style.color = 'var(--success)';
                savingBadge.style.background = 'rgba(16, 185, 129, 0.15)';
                savingBadge.style.borderColor = 'rgba(16, 185, 129, 0.2)';
            } else {
                savingBadge.textContent = `No Savings (Try lowering quality)`;
                savingBadge.style.color = '#eab308'; // Warning color
                savingBadge.style.background = 'rgba(234, 179, 8, 0.15)';
                savingBadge.style.borderColor = 'rgba(234, 179, 8, 0.2)';
            }

            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;

            // Generate filename unique-ish
            const originalName = currentFile.name;
            const dotIndex = originalName.lastIndexOf('.');
            const name = originalName.substring(0, dotIndex);

            let ext = blob.type.split('/')[1];
            if (!ext) ext = 'jpg';
            if (ext === 'jpeg') ext = 'jpg';

            // Add quality to filename to ensure uniqueness from original and clarity
            const timestamp = new Date().getTime().toString().slice(-4);
            a.download = `compressed_${name}_q${qualitySlider.value}_${timestamp}.${ext}`;

            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(downloadUrl);

        } catch (error) {
            alert('An error occurred during compression. Please try again.');
            console.error(error);
        } finally {
            compressBtn.innerHTML = originalBtnText;
            compressBtn.disabled = false;
        }
    });
});
