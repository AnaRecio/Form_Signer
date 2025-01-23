const express = require('express');
const PDFDocument = require('pdfkit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Aumentar límites
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

// Servir archivos estáticos
app.use(express.static(path.join(__dirname, '../public')));

// Configurar headers CORS
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

app.post('/generate-pdf', async (req, res) => {
    try {
        console.log('Receiving PDF generation request...');
        const { name, email, signature, photos } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required'
            });
        }

        const doc = new PDFDocument();
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => {
            const pdfData = Buffer.concat(chunks);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=PDF_${name.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
            res.send(pdfData);
        });

        // First page with personal information
        doc.fontSize(18).text('Personal Information', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Name: ${name}`, 100, 150);
        doc.text(`Email: ${email}`, 100, 180);

        // Add signature if exists
        if (signature) {
            doc.moveDown();
            doc.text('Digital Signature:', 100, 220);
            const signatureData = signature.replace(/^data:image\/\w+;base64,/, '');
            const signatureBuffer = Buffer.from(signatureData, 'base64');
            doc.image(signatureBuffer, 100, 240, { width: 200 });
        }

        // Add photos if they exist
        if (photos && photos.length > 0) {
            photos.forEach((photo, index) => {
                doc.addPage();
                doc.fontSize(14).text(`ID Photo ${index + 1}`, { align: 'center' });
                doc.moveDown();
                
                try {
                    const photoData = photo.replace(/^data:image\/\w+;base64,/, '');
                    const photoBuffer = Buffer.from(photoData, 'base64');
                    doc.image(photoBuffer, {
                        fit: [500, 700],
                        align: 'center',
                        valign: 'center'
                    });
                } catch (err) {
                    console.error(`Error processing photo ${index + 1}:`, err);
                    doc.text(`Error loading photo ${index + 1}`, { align: 'center' });
                }
            });
        }

        doc.end();

    } catch (err) {
        console.error('Error generating PDF:', err);
        res.status(500).json({
            success: false,
            message: 'Error generating PDF: ' + err.message
        });
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