document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('signature-pad');
    const signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
    });

    // Limpiar firma
    document.getElementById('clear-signature').addEventListener('click', () => {
        signaturePad.clear();
    });

    // Manejar el envío del formulario
    document.getElementById('form').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        try {
            const loadingMessage = document.createElement('div');
            loadingMessage.textContent = 'Processing... Please wait.';
            loadingMessage.style.position = 'fixed';
            loadingMessage.style.top = '50%';
            loadingMessage.style.left = '50%';
            loadingMessage.style.transform = 'translate(-50%, -50%)';
            loadingMessage.style.padding = '20px';
            loadingMessage.style.background = 'rgba(0,0,0,0.8)';
            loadingMessage.style.color = 'white';
            loadingMessage.style.borderRadius = '5px';
            document.body.appendChild(loadingMessage);

            const photoInput = document.getElementById('idPhotos');
            const photos = [];
            
            // Comprimir cada imagen
            for (let file of photoInput.files) {
                loadingMessage.textContent = `Compressing image ${photos.length + 1} of ${photoInput.files.length}...`;
                const compressedImage = await compressImage(file);
                photos.push(compressedImage);
            }

            loadingMessage.textContent = 'Generating PDF...';

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

            document.body.removeChild(loadingMessage);
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating PDF: ' + error.message);
            const loadingMessage = document.querySelector('div');
            if (loadingMessage) document.body.removeChild(loadingMessage);
        }
    });

    // Agregar esto después de la inicialización del signature pad
    const fileInput = document.getElementById('idPhotos');
    const selectedFiles = document.getElementById('selected-files');

    fileInput.addEventListener('change', function(e) {
        const files = Array.from(this.files);
        if (files.length > 0) {
            selectedFiles.style.display = 'block';
            selectedFiles.innerHTML = files.map(file => 
                `<div>${file.name}</div>`
            ).join('');
        } else {
            selectedFiles.style.display = 'none';
            selectedFiles.innerHTML = '';
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