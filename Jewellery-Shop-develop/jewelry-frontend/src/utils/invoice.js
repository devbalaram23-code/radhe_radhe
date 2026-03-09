function formatCurrency(n) {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

// Basic number to words (works for up to crores; fine for typical bills)
function numberToWords(num) {
  if (!num && num !== 0) return '';
  const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  function inWords(n) {
    if (n < 20) return a[n];
    if (n < 100) return b[Math.floor(n / 10)] + (n % 10 ? ' ' + a[n % 10] : '');
    if (n < 1000) return a[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + inWords(n % 100) : '');
    if (n < 100000) return inWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + inWords(n % 1000) : '');
    if (n < 10000000) return inWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + inWords(n % 100000) : '');
    return inWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + inWords(n % 10000000) : '');
  }

  const parts = String(num).split('.');
  const intPart = parseInt(parts[0], 10) || 0;
  const fracPart = parts[1] ? parts[1].slice(0,2) : '';
  let words = inWords(intPart) || 'Zero';
  if (fracPart) words += ' and ' + inWords(parseInt(fracPart,10)) + ' Paise';
  return words;
}

export function generateInvoiceHTML(data) {
  const { billNumber, date, customerName, mobileNumber, address, billItems, subtotal, cgst, sgst, totalGst, roundOff, grandTotal, advanceApplied } = data;

  // Sort items to show old gold at the bottom
  const sortedItems = [...billItems].sort((a, b) => {
    const aIsOld = a.hsnCode === 'OLD';
    const bIsOld = b.hsnCode === 'OLD';
    if (aIsOld && !bIsOld) return 1;
    if (!aIsOld && bIsOld) return -1;
    return 0;
  });

  // Pre-compute totals for clarity and to keep GST base independent of old gold deductions
  const totalMaking = billItems.reduce((s, it) => s + (it.makingCharge || 0), 0);
  const totalOther = billItems.reduce((s, it) => s + (it.otherCharges || 0), 0);
  const totalOld = billItems.reduce((s, it) => s + (it.oldGoldValue || 0), 0);
  const taxableAmount = subtotal + totalMaking + totalOther;
  const amountBeforeRound = grandTotal - roundOff; // includes old gold deduction after GST
  const advanceValue = parseFloat(advanceApplied || 0) || 0;
  const netPayable = Math.max(grandTotal - advanceValue, 0);

  const rows = sortedItems.map((it, idx) => {
    const gross = (it.grossWeight || 0).toFixed(3);
    const net = (it.netGoldWeight || 0).toFixed(3);
    const ratePerGram = (it.goldRatePerGram || 0).toFixed(2);
    const makingPerGram = (it.makingValue || 0).toFixed(2);
    const isOldGold = it.hsnCode === 'OLD' && (it.oldGoldValue || 0) > 0;
    const amount = (isOldGold ? -(it.oldGoldValue || 0) : (it.total || 0)).toFixed(2);
    const amountColor = isOldGold ? '#d4701d' : '#d4af37';
    return `
      <tr style="background-color: #ffffff;">
        <td style="padding: 4px 3px; color: #333333; border: 1px solid #e0e0e0; text-align: center; font-weight: 600; font-size: 10px;">${idx+1}</td>
        <td style="padding: 4px 3px; color: #1a1a1a; border: 1px solid #e0e0e0; font-weight: 600; font-size: 10px;">${it.itemDescription || ''}</td>
        <td style="padding: 4px 3px; color: #666666; border: 1px solid #e0e0e0; text-align: center; font-size: 10px;">${it.hsnCode || ''}</td>
        <td style="padding: 4px 3px; color: #666666; border: 1px solid #e0e0e0; text-align: center; font-size: 10px;">${it.purity || ''}</td>
        <td style="padding: 4px 3px; color: #666666; border: 1px solid #e0e0e0; text-align: center; font-size: 10px;">${it.productCode || ''}</td>
        <td class="numeric" style="padding: 4px 3px; color: #333333; border: 1px solid #e0e0e0; font-size: 10px;">1</td>
        <td class="numeric" style="padding: 4px 3px; color: #333333; border: 1px solid #e0e0e0; font-size: 10px;">${gross}</td>
        <td class="numeric" style="padding: 4px 3px; color: #333333; border: 1px solid #e0e0e0; font-weight: 600; font-size: 10px;">${net}</td>
        <td class="numeric" style="padding: 4px 3px; color: #333333; border: 1px solid #e0e0e0; font-size: 10px;">${ratePerGram}</td>
        <td class="numeric" style="padding: 4px 3px; color: #666666; border: 1px solid #e0e0e0; font-size: 10px;">${makingPerGram}</td>
        <td class="numeric" style="padding: 4px 3px; color: ${amountColor}; border: 1px solid #e0e0e0; font-weight: 700; font-size: 10px;">${formatCurrency(Number(amount))}</td>
      </tr>`;
  }).join('\n');

  const totalAmountWords = numberToWords(advanceValue > 0 ? netPayable : grandTotal) + ' Only';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>GST Invoice - ${billNumber}</title>
<style>
:root{--accent:#d4af37;--dark:#1a1a1a;--muted:#666;}
.invoice-body{margin:0;padding:0;font-family: 'Helvetica Neue', Arial, sans-serif;background:#f5f5f5;color:#111;-webkit-print-color-adjust:exact;}
.invoice-wrap{padding:12px 8px;}
.table-root{max-width:210mm;width:100%;margin:0 auto;background:#fff;border-collapse:collapse;border:2px solid var(--accent);box-shadow:0 0 14px rgba(0,0,0,0.06);box-sizing:border-box;}
.top-bar{padding:6px 10px;background:linear-gradient(135deg,var(--dark) 0%, #2d2d2d 100%);border-bottom:3px solid var(--accent);}
.shop-header{padding:10px 10px 8px;text-align:center;background:linear-gradient(to bottom,#fffbf0 0%,#fff 100%);}
.customer-table,.items-table,.totals-table{width:100%;border-collapse:collapse;font-size:10px;}
.items-table th{padding:4px 3px;font-weight:700;color:#fff;background:#111;border:1px solid #3d3d3d;text-align:left;font-size:10px;}
.items-table td{padding:4px 3px;border:1px solid #eaeaea;vertical-align:middle;font-size:10px;}
.items-table td.numeric{text-align:right;font-feature-settings:'tnum';}
.amount-words{background:#fffef9;border:1px solid #f0e5d0;border-radius:4px;padding:4px 3px;font-size:9px;}
.totals-table td{padding:4px 3px;border:1px solid #eaeaea;text-align:right;font-size:10px;}
.footer{padding:15px 20px;background:linear-gradient(135deg,var(--dark) 0%, #2d2d2d 100%);text-align:center;color:var(--accent);}
@media print{ @page{size:A4;margin:8mm;}body.invoice-body{background:#fff} .table-root{box-shadow:none;border:none} .items-table th{background:#111 !important;color:#fff !important;-webkit-print-color-adjust:exact} tr{page-break-inside:avoid} .no-print{display:none} }
</style>
</head>
<body class="invoice-body">
<table role="presentation" style="width: 100%; border-collapse: collapse; padding: 20px 10px;">
  <tr>
    <td style="padding: 0;">
      <table role="presentation" class="table-root" style="max-width: 210mm; width: 100%; margin: 0 auto; background-color: #ffffff; border-collapse: collapse;">

        <!-- Top Info Bar -->
        <tr>
          <td style="padding: 6px 10px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); border-bottom: 3px solid #d4af37;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
              <td style="font-size: 9px; color: #d4af37; font-weight: 600; width: 33%;">GSTIN: 21AZZPS1201M1Z3</td>
              <td style="font-size: 9px; color: #ffffff; font-weight: 700; text-align: center; letter-spacing: 0.5px; width: 34%;">GST INVOICE</td>
              <td style="font-size: 9px; color: #d4af37; font-weight: 600; text-align: right; width: 33%;">${date}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Shop Name Header -->
        <tr>
          <td style="padding: 0px 10px 4px; text-align: center; background: linear-gradient(to bottom, #fffbf0 0%, #ffffff 100%);">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="text-align: center;">
                  <table role="presentation" style="margin: 0 auto; border-collapse: collapse;">
                    <tr>
                      <td style="font-size: 16px; font-weight: 800; color: #1a1a1a; letter-spacing: 1px; text-transform: uppercase; padding-bottom: 4px;">M/S. RADHAGOBINDA JEWELLERS</td>
                    </tr>
                    <tr>
                      <td style="padding-bottom: 4px;">
                        <div style="height: 2px; width: 150px; background: #d4af37; margin: 0 auto; border-radius: 2px;"></div>
                      </td>
                    </tr>
                    <tr>
                      <td style="font-size: 11px; color: #d4af37; font-weight: 700; letter-spacing: 0.6px; padding-bottom: 3px;">BIS HALLMARK Gold Jewellery Showroom</td>
                    </tr>
                    <tr>
                      <td style="font-size: 10px; color: #333333; line-height: 1.5;">
                        Spl. in Gold, Diamonds & Silver Ornaments<br />
                        JAGESWARPUR, JAJPUR TOWN, JAJPUR – 755001<br />
                        Mob: 9937602928 | Email: radhagobindajewellery.h@gmail.com
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Customer & Invoice Info -->
        <tr>
          <td style="padding: 0 20px 10px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; font-size: 10px;">
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 4px 3px; border: 1px solid #e0e0e0; width: 50%;"><strong style="color: #1a1a1a;">Name:</strong> <span style="color: #333333;">${customerName || ''}</span></td>
                <td style="padding: 4px 3px; border: 1px solid #e0e0e0; width: 50%;"><strong style="color: #1a1a1a;">Bill No.:</strong> <span style="color: #d4af37; font-weight: 700;">${billNumber}</span></td>
              </tr>
              <tr style="background-color: #ffffff;">
                <td style="padding: 4px 3px; border: 1px solid #e0e0e0;"><strong style="color: #1a1a1a;">Mobile:</strong> <span style="color: #333333;">${mobileNumber || ''}</span></td>
                <td style="padding: 4px 3px; border: 1px solid #e0e0e0;"><strong style="color: #1a1a1a;">Address:</strong> <span style="color: #333333;">${address || '-'}</span></td>
              </tr>
              <tr style="background-color: #f8f9fa;">
                <td style="padding: 4px 3px; border: 1px solid #e0e0e0;"><strong style="color: #1a1a1a;">Date:</strong> <span style="color: #333333;">${date}</span></td>
                <td style="padding: 4px 3px; border: 1px solid #e0e0e0;"></td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Items Table -->
        <tr>
          <td style="padding: 0 20px 15px;">
            <table role="presentation" class="items-table" style="width: 100%; border-collapse: collapse; font-size: 10px;">
              <tr style="background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);">
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 4%; font-size: 10px;">S.No</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; width: 18%; font-size: 10px;">Description of Goods</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 6%; font-size: 10px;">HSN</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 7%; font-size: 10px;">Purity</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 8%; font-size: 10px;">HUID</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 6%; font-size: 10px;">PC</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 8%; font-size: 10px;">Gross Wt</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: center; width: 8%; font-size: 10px;">Net Wt</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: right; width: 8%; font-size: 10px;">Rate</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: right; width: 9%; font-size: 10px;">Making</td>
                <td style="padding: 4px 3px; font-weight: 700; color: #ffffff; border: 1px solid #3d3d3d; text-align: right; width: 10%; font-size: 10px;">Amount</td>
              </tr>
              ${rows}
            </table>
          </td>
        </tr>

        <!-- Amount in Words -->
        <tr>
          <td style="padding: 0 20px 15px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #fffef9; border: 1px solid #f0e5d0; border-radius: 4px;">
              <tr>
                <td style="padding: 8px 10px; font-size: 10px; color: #1a1a1a;">
                  <strong style="color: #d4af37;">Amount in words:</strong> <span style="color: #333333; font-weight: 600;">Rs. ${totalAmountWords}</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tax and Totals -->
        <tr>
          <td style="padding: 0 20px 15px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 55%; vertical-align: top;"></td>
                <td style="width: 45%; vertical-align: top;">
                  <table role="presentation" style="width: 100%; border-collapse: collapse; font-size: 10px; border: 1px solid #e0e0e0;">
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #333333; font-size: 10px;">Gold Value (Subtotal)</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 10px;">${formatCurrency(subtotal)}</td>
                    </tr>
                    ${totalMaking > 0 ? `
                    <tr style="background-color: #ffffff;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #333333; font-size: 10px;">Add: Making Charges</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 10px;">${formatCurrency(totalMaking)}</td>
                    </tr>` : ''}
                    ${totalOther > 0 ? `
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #333333; font-size: 10px;">Add: Other Charges</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 10px;">${formatCurrency(totalOther)}</td>
                    </tr>` : ''}
                    <tr style="background-color: #f0f0f0;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #1a1a1a; font-weight: 600; font-size: 10px;">Taxable Amount</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 700; font-size: 10px;">${formatCurrency(taxableAmount)}</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #333333; font-size: 10px;">Add: CGST ${cgst}%</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 10px;">${formatCurrency((totalGst/2))}</td>
                    </tr>
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #333333; font-size: 10px;">Add: SGST ${sgst}%</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 10px;">${formatCurrency((totalGst/2))}</td>
                    </tr>
                    ${totalOld > 0 ? `
                    <tr style="background-color: #fff5e6;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #d4701d; font-weight: 600; font-size: 10px;">Less: Old Gold Value</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #d4701d; font-weight: 700; font-size: 10px;">-${formatCurrency(totalOld)}</td>
                    </tr>` : ''}
                    <tr style="background: linear-gradient(135deg, #d4af37 0%, #c9941d 100%);">
                      <td style="padding: 6px 4px; border: 1px solid #b8932f; color: #1a1a1a; font-weight: 700; font-size: 10px;">Total Amount After Tax</td>
                      <td style="padding: 6px 4px; border: 1px solid #b8932f; text-align: right; color: #1a1a1a; font-weight: 700; font-size: 10px;">${formatCurrency(amountBeforeRound)}</td>
                    </tr>
                    ${roundOff !== 0 ? `
                    <tr style="background-color: #ffffff;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #333333; font-size: 10px;">Round Off</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #1a1a1a; font-weight: 600; font-size: 10px;">${formatCurrency(roundOff)}</td>
                    </tr>` : ''}
                    ${advanceValue > 0 ? `
                    <tr style="background-color: #fff5e6;">
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; color: #d4701d; font-weight: 600; font-size: 10px;">Less: Advance</td>
                      <td style="padding: 4px 3px; border: 1px solid #e0e0e0; text-align: right; color: #d4701d; font-weight: 700; font-size: 10px;">-${formatCurrency(advanceValue)}</td>
                    </tr>` : ''}
                    <tr style="background-color: #1a1a1a;">
                      <td style="padding: 8px 6px; border: 1px solid #2d2d2d; color: #ffffff; font-weight: 700; font-size: 10px; letter-spacing: 0.5px;">NET AMOUNT</td>
                      <td style="padding: 8px 6px; border: 1px solid #2d2d2d; text-align: right; color: #d4af37; font-weight: 700; font-size: 10px;">${formatCurrency(advanceValue > 0 ? netPayable : grandTotal)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Payment Details & Declaration -->
        <tr>
          <td style="padding: 0 20px 15px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="width: 50%; vertical-align: top; padding-right: 10px;">
                  ${data.paymentMode ? `
                  <table role="presentation" style="width: 100%; border-collapse: collapse; border: 1px solid #e0e0e0; font-size: 11px;">
                    <tr style="background-color: #f8f9fa;">
                      <td colspan="2" style="padding: 8px 12px; border: 1px solid #e0e0e0; font-weight: 700; color: #1a1a1a;">Payment Details</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #333333; width: 40%;">Payment Mode:</td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #1a1a1a; font-weight: 600;">${data.paymentMode}</td>
                    </tr>
                    ${data.amountPaid ? `
                    <tr style="background-color: #f8f9fa;">
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #333333;">Amount Paid:</td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #1a1a1a; font-weight: 600;">${formatCurrency(data.amountPaid)}</td>
                    </tr>
                    <tr style="background-color: #ffffff;">
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: #333333;">Balance Due:</td>
                      <td style="padding: 8px 12px; border: 1px solid #e0e0e0; color: ${(grandTotal - data.amountPaid) > 0 ? '#d4701d' : '#1a1a1a'}; font-weight: 700;">${formatCurrency(grandTotal - data.amountPaid)}</td>
                    </tr>` : ''}
                  </table>` : ''}

                </td>
                <td style="width: 50%; vertical-align: top; padding-left: 10px;">
                  <table role="presentation" style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 20px 0; text-align: right;">
                        <div style="font-size: 10px; color: #666666; margin-bottom: 40px;">For M/S. RADHAGOBINDA JEWELLERS</div>
                        <div style="border-top: 1px solid #333333; display: inline-block; width: 150px; margin-top: 10px;"></div>
                        <div style="font-size: 9px; color: #333333; font-weight: 600; margin-top: 5px;">Authorized Signatory</div>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Declaration -->
        <tr>
          <td style="padding: 0 20px 20px;">
            <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; border: 1px solid #e0e0e0;">
              <tr>
                <td style="padding: 12px 15px; font-size: 9px; color: #333333; line-height: 1.4;">
                  <strong style="color: #1a1a1a;">Declaration & Terms:</strong> We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. Certified that the particulars given above are true and correct.<br/><br/>
                  • Goods once sold cannot be taken back.<br/>
                  • All subject to Jajpur Jurisdiction.<br/>
                  • The registration certificate is valid on the date of issue of this invoice.
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding: 15px 20px; background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%); text-align: center;">
            <div style="font-size: 11px; color: #d4af37; font-weight: 600;">Thank you for your business!</div>
            <div style="font-size: 9px; color: #999999; margin-top: 5px;">Subject to Jajpur Jurisdiction | Terms & Conditions Apply</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;
}

export function printInvoice(data) {
  const html = generateInvoiceHTML(data);
  const w = window.open('', '_blank');
  if (!w) {
    alert('Pop-up blocked. Please allow pop-ups for this site to print.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  // give the browser a moment to render
  setTimeout(() => {
    w.focus();
    w.print();
  }, 500);
}

export async function saveBillToStorage(data) {
  const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:8080";
  
  try {
    // Save to backend database
    const response = await fetch(`${API_BASE}/api/bills`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to save bill');
    }

    const result = await response.json();
    console.log('Bill saved to database:', result);
    
    return result.bill;
  } catch (error) {
    console.error('Error saving bill to database, saving to localStorage as backup:', error);
    
    // Fallback to localStorage only if API fails
    const existing = JSON.parse(localStorage.getItem('savedBills') || '[]');
    const toSave = { id: Date.now(), ...data };
    existing.push(toSave);
    localStorage.setItem('savedBills', JSON.stringify(existing));
    
    throw error; // Re-throw to let the caller handle the error
  }
}

export default {
  generateInvoiceHTML,
  printInvoice,
  saveBillToStorage,
};
