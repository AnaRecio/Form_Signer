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
            // Verificar si hay archivos seleccionados
            const photoInput = document.getElementById('idPhotos');
            if (!photoInput.files || photoInput.files.length === 0) {
                alert('Please select at least one photo');
                return;
            }

            console.log('Number of photos selected:', photoInput.files.length);
            
            // Convertir fotos a base64
            const photos = [];
            for (let file of photoInput.files) {
                console.log('Processing file:', file.name);
                try {
                    const photoBase64 = await fileToBase64(file);
                    photos.push(photoBase64);
                    console.log('Photo processed successfully');
                } catch (error) {
                    console.error('Error processing photo:', error);
                }
            }

            console.log('Total photos processed:', photos.length);

            const formData = {
                name: document.getElementById('name').value,
                email: document.getElementById('email').value,
                signature: signaturePad.isEmpty() ? null : signaturePad.toDataURL(),
                photos: photos
            };

            console.log('Sending data to server...');
            console.log('Photos included:', formData.photos.length);

            const response = await fetch('/generate-pdf', {
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
                
                // Limpiar formulario
                document.getElementById('form').reset();
                signaturePad.clear();
                
                alert('PDF generated successfully. Check your downloads.');
            } else {
                const error = await response.text();
                alert('Error: ' + error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Error generating PDF: ' + error.message);
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