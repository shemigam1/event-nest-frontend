import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { formatEventDate } from '@/utils/dateFormat';

/* ────────────────────────────────────────────────────────────────────────────
   Ticket → PDF.

   Generates a clean A4 ticket with selectable text + a sharp QR code,
   produced entirely client-side. We deliberately render the layout with
   jsPDF primitives (rect / text / image) rather than html2canvas-ing the
   existing card — the result is a real text PDF (smaller, accessible,
   prints cleanly) instead of a fuzzy screenshot.

   Layout (A4 portrait):
     ┌──────────────────────────────────────────────────────┐
     │ EVENTNEST · BOARDING PASS                            │
     │                                                      │
     │   ┌──────────────────────────────────────────────┐   │
     │   │ <Event title>                                │   │
     │   │                                              │   │
     │   │  WHEN   | <date>      WHERE   | <venue>      │   │
     │   │  TIER   | <tier>      SEAT    | <seat>       │   │
     │   │                                              │   │
     │   │  ┌─────────────┐   Short code: ABC-123       │   │
     │   │  │  [QR code]  │   Long  code: <ticketId>    │   │
     │   │  │             │   Status:     ACTIVE        │   │
     │   │  └─────────────┘                             │   │
     │   │                                              │   │
     │   │  Present this QR at the gate. Do not share.  │   │
     │   └──────────────────────────────────────────────┘   │
     │                                                      │
     │  Issued <date> · Ticket #<short>                     │
     └──────────────────────────────────────────────────────┘
   ─────────────────────────────────────────────────────────────────────────── */

const PAGE = { w: 210, h: 297 };       // A4 mm
const MARGIN = 20;
const CARD = { x: MARGIN, y: 38, w: PAGE.w - 2 * MARGIN, h: 200 };

const COLOURS = {
    navy:   [2,  16, 45],
    blue:   [3,  87, 238],
    text1:  [17, 24, 39],
    text2:  [75, 85, 99],
    text3:  [148, 163, 184],
    border: [226, 232, 240],
    subtle: [248, 250, 252],
};

function setFill(doc, c)   { doc.setFillColor(c[0], c[1], c[2]); }
function setStroke(doc, c) { doc.setDrawColor(c[0], c[1], c[2]); }
function setText(doc, c)   { doc.setTextColor(c[0], c[1], c[2]); }

/**
 * Generate and trigger a download of the PDF for the given ticket.
 * Pass an object that matches our TicketResponse shape — eventTitle,
 * tierName, seatNumber, qrCode, shortCode, status, issuedAt, etc.
 */
export async function downloadTicketPdf(ticket) {
    const doc = new jsPDF({ unit: 'mm', format: 'a4', compress: true });

    drawHeader(doc);
    drawCard(doc);
    await drawCardContent(doc, ticket);
    drawFooter(doc, ticket);

    const safeTitle = sanitizeFilename(ticket.eventTitle || 'event');
    const code = ticket.shortCode || String(ticket.id ?? '').slice(0, 8) || 'ticket';
    doc.save(`${safeTitle}-${code}.pdf`);
}

function drawHeader(doc) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    setText(doc, COLOURS.navy);
    doc.text('EVENTNEST', MARGIN, 22);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(doc, COLOURS.text3);
    doc.text('· BOARDING PASS', MARGIN + 26, 22);
}

function drawCard(doc) {
    // Background card with subtle border + corner rounding.
    setFill(doc, [255, 255, 255]);
    setStroke(doc, COLOURS.border);
    doc.setLineWidth(0.4);
    doc.roundedRect(CARD.x, CARD.y, CARD.w, CARD.h, 3, 3, 'FD');

    // Top accent strip — the navy "stub" lookalike.
    setFill(doc, COLOURS.navy);
    doc.roundedRect(CARD.x, CARD.y, CARD.w, 6, 3, 3, 'F');
    // Square off the bottom of the strip so the rounded corner doesn't bleed.
    setFill(doc, COLOURS.navy);
    doc.rect(CARD.x, CARD.y + 3, CARD.w, 3, 'F');
}

async function drawCardContent(doc, ticket) {
    const innerX = CARD.x + 12;
    const innerY = CARD.y + 18;
    const innerW = CARD.w - 24;

    // Event title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    setText(doc, COLOURS.text1);
    const titleLines = doc.splitTextToSize(ticket.eventTitle ?? 'Event', innerW);
    doc.text(titleLines, innerX, innerY);

    let cursorY = innerY + titleLines.length * 7 + 6;

    // Divider
    setStroke(doc, COLOURS.border);
    doc.setLineWidth(0.3);
    doc.line(innerX, cursorY, innerX + innerW, cursorY);

    cursorY += 10;

    // Two-column field grid: WHEN | WHERE  /  TIER | SEAT
    const colWidth = innerW / 2;
    const when  = ticket.eventStartTime ? formatEventDate(ticket.eventStartTime) : '—';
    const where = ticket.eventVenue ?? '—';
    const tier  = ticket.tierName ?? '—';
    const seat  = ticket.seatNumber ?? '—';

    drawField(doc, innerX,             cursorY, colWidth - 6, 'WHEN',  when);
    drawField(doc, innerX + colWidth,  cursorY, colWidth - 6, 'WHERE', where);
    cursorY += 16;
    drawField(doc, innerX,             cursorY, colWidth - 6, 'TIER',  tier);
    drawField(doc, innerX + colWidth,  cursorY, colWidth - 6, 'SEAT',  String(seat));

    cursorY += 22;

    // Divider
    doc.line(innerX, cursorY, innerX + innerW, cursorY);

    cursorY += 10;

    // QR + codes block — QR on the left, codes on the right.
    const qrSize = 50;
    const qrValue = ticket.qrCode || String(ticket.id ?? '');
    if (qrValue) {
        // Generate as a high-res PNG data URL. Margin: 1 → minimal quiet zone,
        // since we already pad with whitespace in the card layout.
        const qrPng = await QRCode.toDataURL(qrValue, {
            errorCorrectionLevel: 'M',
            margin: 1,
            width: 600, // render large then scale down for sharpness
            color: { dark: '#02102D', light: '#FFFFFF' },
        });
        doc.addImage(qrPng, 'PNG', innerX, cursorY, qrSize, qrSize);
    } else {
        // Fallback box so the layout still looks right.
        setStroke(doc, COLOURS.border);
        doc.rect(innerX, cursorY, qrSize, qrSize);
        doc.setFontSize(8);
        setText(doc, COLOURS.text3);
        doc.text('No QR available', innerX + qrSize / 2, cursorY + qrSize / 2, { align: 'center' });
    }

    // Codes column
    const codesX = innerX + qrSize + 12;
    let codesY  = cursorY + 4;

    if (ticket.shortCode) {
        drawCodeLine(doc, codesX, codesY, 'Short code', ticket.shortCode);
        codesY += 12;
    }
    if (ticket.qrCode) {
        drawCodeLine(doc, codesX, codesY, 'Long code', ticket.qrCode);
        codesY += 12;
    }
    if (ticket.status) {
        drawCodeLine(doc, codesX, codesY, 'Status', ticket.status);
        codesY += 12;
    }

    // Reminder line under the QR
    cursorY += qrSize + 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    setText(doc, COLOURS.text2);
    doc.text(
        'Present this QR code at the gate. Do not share or reproduce — once scanned, this ticket is used.',
        innerX,
        cursorY,
        { maxWidth: innerW },
    );
}

function drawField(doc, x, y, w, label, value) {
    // Tiny uppercase label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, COLOURS.text3);
    doc.text(label, x, y);

    // Value (wraps if too long)
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    setText(doc, COLOURS.text1);
    const lines = doc.splitTextToSize(String(value ?? '—'), w);
    doc.text(lines.slice(0, 2), x, y + 5);
}

function drawCodeLine(doc, x, y, label, value) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setText(doc, COLOURS.text3);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    setText(doc, COLOURS.text1);
    // Wrap long QR-style codes so they don't run off the card.
    const lines = doc.splitTextToSize(String(value), 70);
    doc.text(lines.slice(0, 2), x, y + 5);
}

function drawFooter(doc, ticket) {
    const y = CARD.y + CARD.h + 10;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setText(doc, COLOURS.text3);

    const issued = ticket.issuedAt ? formatEventDate(ticket.issuedAt) : null;
    const parts = ['Generated by EventNest'];
    if (issued) parts.push(`Issued ${issued}`);
    if (ticket.shortCode) parts.push(`Ticket #${ticket.shortCode}`);
    doc.text(parts.join('  ·  '), MARGIN, y);
}

function sanitizeFilename(s) {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 60) || 'ticket';
}
