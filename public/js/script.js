document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('signature-pad');
    const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        velocityFilterWeight: 0.7
    });

    // Ajustar el tamaño del canvas
    function resizeCanvas() {
        const ratio = Math.max(window.devicePixelRatio || 1, 1);
        canvas.width = canvas.offsetWidth * ratio;
        canvas.height = canvas.offsetHeight * ratio;
        canvas.getContext("2d").scale(ratio, ratio);
        signaturePad.clear();
    }

    window.addEventListener("resize", resizeCanvas);
    resizeCanvas();

    // Limpiar firma
    document.getElementById('clear-signature').addEventListener('click', function() {
        signaturePad.clear();
    });

    // Manejo de fotos
    const photoInput = document.getElementById('idPhotos');
    const takePhotoBtn = document.getElementById('takePhoto');
    const selectPhotoBtn = document.getElementById('selectPhoto');
    const photoPreview = document.getElementById('photo-preview');
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    takePhotoBtn.addEventListener('click', () => {
        photoInput.setAttribute('capture', 'environment');
        photoInput.click();
    });

    selectPhotoBtn.addEventListener('click', () => {
        photoInput.removeAttribute('capture');
        photoInput.click();
    });

    photoInput.addEventListener('change', function(e) {
        const files = Array.from(this.files);
        photoPreview.innerHTML = '';
        
        if (files.length > 0) {
            loadingOverlay.classList.remove('hidden');
            loadingText.textContent = 'Processing photos...';
            
            Promise.all(files.map(file => compressImage(file)))
                .then(compressedImages => {
                    photoPreview.innerHTML = '';
                    compressedImages.forEach((dataUrl, index) => {
                        const img = document.createElement('img');
                        img.src = dataUrl;
                        photoPreview.appendChild(img);
                    });
                    loadingOverlay.classList.add('hidden');
                })
                .catch(error => {
                    console.error('Error processing images:', error);
                    alert('Error processing images. Please try again.');
                    loadingOverlay.classList.add('hidden');
                });
        }
    });

    // Función para comprimir imágenes
    async function compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7));
                };
            };
        });
    }

    // Manejo del formulario
    document.getElementById('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            loadingOverlay.classList.remove('hidden');
            loadingText.textContent = 'Generating PDF...';

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                signature: signaturePad.isEmpty() ? null : signaturePad.toDataURL(),
                photos: Array.from(photoPreview.getElementsByTagName('img')).map(img => img.src)
            };

            const response = await fetch('/api/generate-pdf', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `PDF_${formData.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                
                document.getElementById('form').reset();
                signaturePad.clear();
                photoPreview.innerHTML = '';
                
                alert('PDF generated successfully!');
            } else {
                throw new Error('Failed to generate PDF');
            }

        } catch (error) {
            console.error('Error:', error);
            alert('Error generating PDF: ' + error.message);
        } finally {
            loadingOverlay.classList.add('hidden');
        }
    });
}); 