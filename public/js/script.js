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

    // Botones de foto
    document.getElementById('takePhoto').addEventListener('click', () => {
        document.getElementById('idPhotos').click();
    });

    document.getElementById('selectPhoto').addEventListener('click', () => {
        const input = document.getElementById('idPhotos');
        input.removeAttribute('capture');
        input.click();
        input.setAttribute('capture', 'environment');
    });

    // Preview de fotos
    document.getElementById('idPhotos').addEventListener('change', function(e) {
        const preview = document.getElementById('photo-preview');
        preview.innerHTML = '';
        
        Array.from(this.files).forEach(file => {
            const reader = new FileReader();
            reader.onload = function(e) {
                const img = document.createElement('img');
                img.src = e.target.result;
                preview.appendChild(img);
            }
            reader.readAsDataURL(file);
        });
    });

    // Limpiar firma
    document.getElementById('clear-signature').addEventListener('click', () => {
        signaturePad.clear();
    });

    // Manejar el envío del formulario
    document.getElementById('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const loadingOverlay = document.getElementById('loading-overlay');
        const loadingText = document.getElementById('loading-text');
        
        try {
            loadingOverlay.classList.remove('hidden');
            
            const photoInput = document.getElementById('idPhotos');
            const photos = [];
            
            // Comprimir cada imagen
            for (let file of photoInput.files) {
                loadingText.textContent = `Compressing image ${photos.length + 1} of ${photoInput.files.length}...`;
                const compressedImage = await compressImage(file);
                photos.push(compressedImage);
            }

            loadingText.textContent = 'Generating PDF...';

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                signature: signaturePad.isEmpty() ? null : signaturePad.toDataURL('image/jpeg', 0.5),
                photos: photos
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
                
                alert('PDF generated successfully!');
            } else {
                throw new Error('Failed to generate PDF');
            }

            loadingOverlay.classList.add('hidden');
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating PDF: ' + error.message);
            loadingOverlay.classList.add('hidden');
        }
    });
});

// Función auxiliar para convertir archivo a base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

async function compressImage(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                // Reducir tamaño máximo
                const MAX_WIDTH = 600;
                const MAX_HEIGHT = 600;
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
                // Reducir calidad a 0.5 (50%)
                resolve(canvas.toDataURL('image/jpeg', 0.5));
            };
        };
    });
} 