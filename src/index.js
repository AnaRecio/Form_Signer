const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Aumentar límites pero mantenerlos razonables
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Configurar headers CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/api/generate-pdf', async (req, res) => {
    try {
        const { name, email, signature, photos } = req.body;

        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            const pdfData = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=PDF_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
            res.send(pdfData);
        });

        // Primera página con información personal y firma
        doc.fontSize(18).text('Personal Information', { align: 'center' });
        doc.moveDown();
        
        // Información personal
        doc.fontSize(12).text(`Name: ${name}`, 50, 150);
        doc.text(`Email: ${email}`, 50, 180);

        // Firma en la misma página
        if (signature) {
            doc.fontSize(14).text('Signature:', 50, 250);
            const sigImg = Buffer.from(signature.split(',')[1], 'base64');
            doc.image(sigImg, 50, 280, { width: 200 });
        }

        // Fotos empiezan en la segunda página
        if (photos && photos.length > 0) {
            photos.forEach((photo, index) => {
                doc.addPage();
                doc.fontSize(14).text(`ID Photo ${index + 1}`, { align: 'center' });
                doc.moveDown();
                
                try {
                    const img = Buffer.from(photo.split(',')[1], 'base64');
                    doc.image(img, {
                        fit: [500, 700],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (error) {
                    console.error(`Error processing photo ${index + 1}:`, error);
                    doc.text(`Error loading photo ${index + 1}`, { align: 'center' });
                }
            });
        }

        doc.end();

    } catch (error) {
        console.error('Error generating PDF:', error);
        res.status(500).json({ error: 'Failed to generate PDF' });
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 