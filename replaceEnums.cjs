const fs = require('fs');
const path = require('path');

const constantsPath = 'helper/constants.js';

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalContent = content;

    // Relative path to constants
    const depth = filePath.split(path.sep).length - 1; // Assuming running from root
    let relPath = '';
    for (let i = 0; i < depth - 1; i++) {
        relPath += '../';
    }
    relPath += 'helper/constants.js';

    // Track what we need to import
    let needHttp = false;
    let needOrder = false;
    let needPayment = false;

    // HTTP Status replacements
    const httpMap = {
        '200': 'OK',
        '201': 'CREATED',
        '400': 'BAD_REQUEST',
        '401': 'UNAUTHORIZED',
        '403': 'FORBIDDEN',
        '404': 'NOT_FOUND',
        '500': 'INTERNAL_SERVER_ERROR'
    };

    content = content.replace(/res\.status\((\d{3})\)/g, (match, p1) => {
        if (httpMap[p1]) {
            needHttp = true;
            return `res.status(HTTP_STATUS.${httpMap[p1]})`;
        }
        return match;
    });

    // Order Status replacements
    const orderMap = {
        "'Pending'": 'PENDING',
        "'Confirmed'": 'CONFIRMED',
        "'Processing'": 'PROCESSING',
        "'Shipped'": 'SHIPPED',
        "'Delivered'": 'DELIVERED',
        "'Cancelled'": 'CANCELLED',
        "'Return Requested'": 'RETURN_REQUESTED',
        "'Returned'": 'RETURNED',
        '"Pending"': 'PENDING',
        '"Confirmed"': 'CONFIRMED',
        '"Processing"': 'PROCESSING',
        '"Shipped"': 'SHIPPED',
        '"Delivered"': 'DELIVERED',
        '"Cancelled"': 'CANCELLED',
        '"Return Requested"': 'RETURN_REQUESTED',
        '"Returned"': 'RETURNED'
    };

    // Replace orderStatus === '...' or orderStatus !== '...'
    content = content.replace(/orderStatus\s*([!=]=+)\s*(['"][^'"]+['"])/g, (match, op, val) => {
        if (orderMap[val]) {
            needOrder = true;
            return `orderStatus ${op} ORDER_STATUS.${orderMap[val]}`;
        }
        return match;
    });

    // Replace orderStatus: '...'
    content = content.replace(/orderStatus:\s*(['"][^'"]+['"])/g, (match, val) => {
        if (orderMap[val]) {
            needOrder = true;
            return `orderStatus: ORDER_STATUS.${orderMap[val]}`;
        }
        return match;
    });

    // Replace order.orderStatus = '...'
    content = content.replace(/order\.orderStatus\s*=\s*(['"][^'"]+['"])/g, (match, val) => {
        if (orderMap[val]) {
            needOrder = true;
            return `order.orderStatus = ORDER_STATUS.${orderMap[val]}`;
        }
        return match;
    });

    // Replace in arrays e.g., ['Cancelled', 'Returned'].includes(order.orderStatus)
    content = content.replace(/\[\s*([^\]]+?)\s*\]\.includes\(order\.orderStatus\)/g, (match, p1) => {
        let changed = false;
        const newArr = p1.split(',').map(s => {
            const trimmed = s.trim();
            if (orderMap[trimmed]) {
                changed = true;
                return `ORDER_STATUS.${orderMap[trimmed]}`;
            }
            return s;
        }).join(', ');
        if (changed) {
            needOrder = true;
            return `[${newArr}].includes(order.orderStatus)`;
        }
        return match;
    });
    
    // Also $nin: ['Cancelled', 'Returned']
    content = content.replace(/\$nin:\s*\[\s*([^\]]+?)\s*\]/g, (match, p1) => {
        let changed = false;
        const newArr = p1.split(',').map(s => {
            const trimmed = s.trim();
            if (orderMap[trimmed]) {
                changed = true;
                return `ORDER_STATUS.${orderMap[trimmed]}`;
            }
            return s;
        }).join(', ');
        if (changed) {
            needOrder = true;
            return `$nin: [${newArr}]`;
        }
        return match;
    });

    // Payment Status replacements
    const paymentMap = {
        "'Pending'": 'PENDING',
        "'Paid'": 'PAID',
        "'Failed'": 'FAILED',
        "'Refunded'": 'REFUNDED',
        '"Pending"': 'PENDING',
        '"Paid"': 'PAID',
        '"Failed"': 'FAILED',
        '"Refunded"': 'REFUNDED'
    };

    // Replace paymentStatus === '...'
    content = content.replace(/paymentStatus\s*([!=]=+)\s*(['"][^'"]+['"])/g, (match, op, val) => {
        if (paymentMap[val]) {
            needPayment = true;
            return `paymentStatus ${op} PAYMENT_STATUS.${paymentMap[val]}`;
        }
        return match;
    });

    // Replace paymentStatus: '...'
    content = content.replace(/paymentStatus:\s*(['"][^'"]+['"])/g, (match, val) => {
        if (paymentMap[val]) {
            needPayment = true;
            return `paymentStatus: PAYMENT_STATUS.${paymentMap[val]}`;
        }
        return match;
    });

    // Replace order.paymentStatus = '...'
    content = content.replace(/order\.paymentStatus\s*=\s*(['"][^'"]+['"])/g, (match, val) => {
        if (paymentMap[val]) {
            needPayment = true;
            return `order.paymentStatus = PAYMENT_STATUS.${paymentMap[val]}`;
        }
        return match;
    });

    // Conditional operator: paymentMethod === 'COD' ? 'Pending' : 'Paid'
    content = content.replace(/\?\s*(['"][^'"]+['"])\s*:\s*(['"][^'"]+['"])/g, (match, val1, val2) => {
        if (paymentMap[val1] && paymentMap[val2]) {
            needPayment = true;
            return `? PAYMENT_STATUS.${paymentMap[val1]} : PAYMENT_STATUS.${paymentMap[val2]}`;
        }
        if (orderMap[val1] && orderMap[val2]) {
            needOrder = true;
            return `? ORDER_STATUS.${orderMap[val1]} : ORDER_STATUS.${orderMap[val2]}`;
        }
        return match;
    });


    if (originalContent !== content) {
        // Add import statement at the top if needed
        let importMap = [];
        if (needHttp) importMap.push('HTTP_STATUS');
        if (needOrder) importMap.push('ORDER_STATUS');
        if (needPayment) importMap.push('PAYMENT_STATUS');
        
        if (importMap.length > 0) {
            const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]*helper\/constants\.js)['"]/;
            const match = content.match(importRegex);
            if (match) {
                let existingImports = match[1].split(',').map(s => s.trim());
                importMap.forEach(imp => {
                    if (!existingImports.includes(imp)) {
                        existingImports.push(imp);
                    }
                });
                content = content.replace(importRegex, `import { ${existingImports.join(', ')} } from '${match[2]}'`);
            } else {
                const importLine = `import { ${importMap.join(', ')} } from '${relPath}';\n`;
                content = importLine + content;
            }
        }

        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated ${filePath}`);
    }
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            walkDir(filePath);
        } else if (filePath.endsWith('.js')) {
            processFile(filePath);
        }
    }
}

walkDir('controllers');
walkDir('service');

walkDir('middlewares');
