import PDFDocument from 'pdfkit';
import { uploadBufferToStorage } from './s3Service.js';

/**
 * Generates an official lease PDF document using PDFKit, overlays the e-signature,
 * and pushes the raw buffer to AWS S3.
 */
export const generateAndUploadLeasePDF = async (lease, tenant, property, base64Signature) => {
    return new Promise((resolve, reject) => {
        try {
            const safeTenant = tenant || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
            const safeProperty = property || { name: 'Assigned Residence', address: 'Property Address', city: 'City', zipCode: '000000' };

            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);
                const filename = `lease_${lease.leaseNumber}.pdf`;
                
                try {
                    const uploadResult = await uploadBufferToStorage(pdfBuffer, filename, 'application/pdf');
                    resolve(uploadResult);
                } catch (err) {
                    reject(err);
                }
            });

            // --- Build Formal Legal PDF Content ---
            doc.fontSize(20).text('RESIDENTIAL LEASE AGREEMENT', { align: 'center' });
            doc.moveDown(2);
            
            doc.fontSize(12).font('Helvetica-Bold').text(`Lease Reference Number: ${lease.leaseNumber}`);
            doc.font('Helvetica').text(`Date of Agreement Execution: ${new Date().toLocaleDateString()}`);
            doc.moveDown(2);

            doc.fontSize(14).font('Helvetica-Bold').text('1. THE PARTIES', { underline: true });
            doc.fontSize(12).font('Helvetica').text(`Landlord/Manager: ${safeProperty.manager?.firstName || 'TMS'} ${safeProperty.manager?.lastName || 'Management'}`);
            doc.text(`Tenant: ${safeTenant.firstName} ${safeTenant.lastName}`);
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('2. THE PREMISES', { underline: true });
            doc.fontSize(12).font('Helvetica').text(`Property Name: ${safeProperty.name}`);
            doc.text(`Address: ${safeProperty.address}, ${safeProperty.city}, ${safeProperty.zipCode || ''}`);
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('3. LEASE TERMS & FINANCIALS', { underline: true });
            doc.fontSize(12).font('Helvetica').text(`Lease Start Date: ${new Date(lease.startDate).toLocaleDateString()}`);
            doc.text(`Lease End Date: ${new Date(lease.endDate).toLocaleDateString()}`);
            doc.text(`Monthly Rent: INR ${lease.rentAmount.toLocaleString('en-IN')}`);
            doc.text(`Security Deposit Held in Escrow: INR ${lease.depositAmount.toLocaleString('en-IN')}`);
            doc.moveDown();

            doc.fontSize(14).font('Helvetica-Bold').text('4. LEGAL DECLARATION', { underline: true });
            doc.fontSize(10).font('Helvetica').text('By signing below, the Tenant acknowledges that they have read, understood, and agree to be bound by the terms and conditions outlined in this electronic agreement. The security deposit is held securely in escrow pending the successful conclusion of the lease period.', { align: 'justify' });
            doc.moveDown(2);

            // Embed Tenant Signature Image dynamically
            doc.fontSize(14).font('Helvetica-Bold').text('5. DIGITAL SIGNATURES', { underline: true });
            doc.moveDown();
            
            if (base64Signature) {
                // Strip the exact MIME prefix to isolate the raw base64 encoded data
                const base64Data = base64Signature.replace(/^data:image\/\w+;base64,/, "");
                const signatureBuffer = Buffer.from(base64Data, 'base64');
                
                doc.fontSize(12).font('Helvetica').text(`Tenant e-Signature Executed By: ${safeTenant.firstName} ${safeTenant.lastName}`);
                doc.moveDown();
                // Embed Base64 Image onto coordinate layout
                doc.image(signatureBuffer, { width: 180 });
            } else {
                doc.fontSize(12).font('Helvetica').text('Tenant Signature: ___________________________');
            }
            
            doc.moveDown(3);
            doc.text('Property Manager / Landlord Signature: ___________________________');
            doc.moveDown(1);
            doc.fontSize(8).text('Electronically signed and verified via TMS Escrow Platform.', { align: 'center', color: 'gray' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

/**
 * Generates an itemized Invoice/Receipt PDF for a completed payment.
 */
export const generateInvoicePDF = async (payment, tenant, property) => {
    return new Promise((resolve, reject) => {
        try {
            const safeTenant = tenant || { firstName: 'Valued', lastName: 'Tenant', email: 'tenant@tms.com' };
            const safeProperty = property || { name: 'Assigned Residence', address: 'Property Address' };

            const doc = new PDFDocument({ margin: 50 });
            const buffers = [];

            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', async () => {
                const pdfBuffer = Buffer.concat(buffers);
                const filename = `invoice_${payment._id}.pdf`;
                
                try {
                    const uploadResult = await uploadBufferToStorage(pdfBuffer, filename, 'application/pdf');
                    resolve(uploadResult);
                } catch (err) {
                    reject(err);
                }
            });

            // --- Build Invoice Content ---
            doc.fontSize(24).font('Helvetica-Bold').text('INVOICE / RECEIPT', { align: 'right' });
            doc.fontSize(10).font('Helvetica').text('TMS Tenant Management System', { align: 'right' });
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('Bill To:');
            doc.font('Helvetica').text(`${safeTenant.firstName} ${safeTenant.lastName}`);
            doc.text(safeTenant.email);
            doc.moveDown();

            doc.fontSize(12).font('Helvetica-Bold').text('Property:');
            doc.font('Helvetica').text(safeProperty.name);
            doc.text(safeProperty.address);
            doc.moveDown(2);

            // Invoice Details Table-like structure
            const tableTop = 270;
            const itemCodeX = 50;
            const descriptionX = 150;
            const amountX = 450;

            doc.fontSize(10).font('Helvetica-Bold');
            doc.text('Code', itemCodeX, tableTop);
            doc.text('Description', descriptionX, tableTop);
            doc.text('Amount', amountX, tableTop, { align: 'right' });

            doc.moveTo(itemCodeX, tableTop + 15).lineTo(550, tableTop + 15).stroke();

            doc.fontSize(10).font('Helvetica');
            const itemY = tableTop + 30;
            doc.text(payment.type.toUpperCase(), itemCodeX, itemY);
            doc.text(`Payment for ${payment.type} - Ref: ${payment.reference || payment._id}`, descriptionX, itemY);
            doc.text(`INR ${payment.amount.toLocaleString('en-IN')}`, amountX, itemY, { align: 'right' });

            doc.moveTo(itemCodeX, itemY + 20).lineTo(550, itemY + 20).stroke();

            doc.moveDown(3);
            doc.fontSize(14).font('Helvetica-Bold').text(`Total Paid: INR ${payment.amountPaid.toLocaleString('en-IN')}`, { align: 'right' });
            doc.moveDown();

            doc.fontSize(10).font('Helvetica-Bold').text('Payment Method:');
            doc.font('Helvetica').text(payment.paymentMethod.toUpperCase());
            doc.text(`Transaction Date: ${new Date(payment.paymentDate).toLocaleString()}`);
            
            doc.moveDown(4);
            doc.fontSize(10).text('Thank you for choosing TMS. This is a computer-generated receipt and does not require a physical signature.', { align: 'center', color: 'gray' });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};
