// ============================================================
// TOKEN OPTIMIZER - Core Engine
// ============================================================

// ---- Token Counter (Approximate) ----
function countTokens(text) {
    if (!text) return 0;
    // ~4 chars per token for English text (standard approximation)
    return Math.ceil(text.length / 4);
}

// ---- Optimization Modes ----
const optimizers = {
    slate: (text) => {
        // General engineering mode - compact structured output
        const lines = text.split('\n').filter(l => l.trim());
        const firstLine = lines[0] || '';

        // Try to extract key info
        const hasError = /error|fail|bug|issue|exception/i.test(text);
        const hasFix = /fix|solution|resolve|patch/i.test(text);

        let result = [];
        if (hasError) {
            const cause = extractFirstMatch(text, /(?:cause|issue|problem|error|bug)[:\s]+([^\n.]+)/i) || 'Issue detected';
            result.push(`Cause: ${cause.trim()}`);
        }
        if (hasFix) {
            const fix = extractFirstMatch(text, /(?:fix|solution|resolve|patch)[:\s]+([^\n.]+)/i) || 'Apply fix';
            result.push(`Fix: ${fix.trim()}`);
        }
        if (!hasError && !hasFix) {
            // Generic compression
            result.push(`Summary: ${firstLine.substring(0, 100)}`);
            const keyPoints = text.match(/[A-Z][^.!?]*[.!?]/g) || [];
            if (keyPoints.length > 1) {
                result.push(`Details: ${keyPoints.slice(1, 4).map(s => s.trim()).join(' ')}`);
            }
        }
        // Always add risk if mentioned
        const risk = extractFirstMatch(text, /(?:risk|danger|warning|security)[:\s]+([^\n.]+)/i);
        if (risk) result.push(`Risk: ${risk.trim()}`);
        if (result.length === 0) {
            result.push(`Compacted: ${text.substring(0, 150).replace(/\s+/g, ' ')}...`);
        }
        return result.join('\n');
    },

    minify: (text) => {
        // Sentence-level minifier
        return text
            .replace(/\b(very|really|quite|extremely|absolutely|totally)\b/gi, '')
            .replace(/\b(in order to|for the purpose of)\b/gi, 'to')
            .replace(/\b(due to the fact that|because of the fact that)\b/gi, 'because')
            .replace(/\b(at this point in time|at the present time)\b/gi, 'now')
            .replace(/\b(in the event that)\b/gi, 'if')
            .replace(/\s{2,}/g, ' ')
            .trim();
    },

    debug: (text) => {
        // Error → Cause → Fix → Proof
        const error = extractFirstMatch(text, /(?:error|exception|fail)[:\s]+([^\n.]+)/i) || 'Unknown error';
        const cause = extractFirstMatch(text, /(?:cause|because|due to|triggered by)[:\s]+([^\n.]+)/i) || 'Under investigation';
        const fix = extractFirstMatch(text, /(?:fix|solution|resolve|patch)[:\s]+([^\n.]+)/i) || 'Fix pending';
        const proof = extractFirstMatch(text, /(?:test|proof|verify|confirm)[:\s]+([^\n.]+)/i) || 'Verification needed';

        return `Error: ${error.trim()}\nCause: ${cause.trim()}\nFix: ${fix.trim()}\nProof: ${proof.trim()}`;
    },

    diff: (text) => {
        // Compact patch summary
        const files = text.match(/[`"']([^`"']+\.[a-z]+)[`"']/gi) || [];
        const changes = extractFirstMatch(text, /(?:change|modify|update|add|remove)[:\s]+([^\n.]+)/i) || 'Changes applied';
        const status = extractFirstMatch(text, /(?:status|result|outcome)[:\s]+([^\n.]+)/i) || 'OK';

        let result = [];
        if (files.length) result.push(`Files: ${files.slice(0, 5).join(', ')}`);
        result.push(`Change: ${changes.trim()}`);
        result.push(`Status: ${status.trim()}`);
        return result.join('\n');
    },

    review: (text) => {
        // Terse code review
        const positives = text.match(/(?:good|nice|great|well|clean)[^.!?]*[.!?]/gi) || [];
        const issues = text.match(/(?:issue|problem|bug|concern|nit|suggestion)[^.!?]*[.!?]/gi) || [];
        const questions = text.match(/\?/g) || [];

        let result = [];
        if (positives.length) result.push(`✅ ${positives.slice(0, 2).map(s => s.trim()).join(' ')}`);
        if (issues.length) result.push(`⚠️ ${issues.slice(0, 3).map(s => s.trim()).join(' ')}`);
        if (questions.length) result.push(`❓ ${questions.length} questions raised`);
        if (result.length === 0) result.push('Review: No significant comments');
        return result.join('\n');
    },

    commit: (text) => {
        // Conventional Commit
        const typeMap = {
            'fix': ['fix', 'bug', 'error', 'issue'],
            'feat': ['feature', 'add', 'new'],
            'docs': ['doc', 'readme', 'comment'],
            'style': ['style', 'format', 'lint'],
            'refactor': ['refactor', 'restructure'],
            'test': ['test', 'spec'],
            'chore': ['chore', 'build', 'config']
        };

        let type = 'chore';
        let scope = '';
        let subject = text.substring(0, 72);

        // Detect type
        const lower = text.toLowerCase();
        for (const [key, words] of Object.entries(typeMap)) {
            if (words.some(w => lower.includes(w))) {
                type = key;
                break;
            }
        }

        // Extract scope
        const scopeMatch = text.match(/(?:in|for|of|to)\s+([a-z-]+)/i);
        if (scopeMatch) scope = scopeMatch[1];

        // Clean subject
        subject = subject.replace(/^(fix|feat|docs|style|refactor|test|chore):\s*/i, '');
        subject = subject.replace(/[^a-zA-Z0-9\s\-_.]/g, '').trim();
        if (subject.length > 72) subject = subject.substring(0, 72) + '...';

        const scopePart = scope ? `(${scope})` : '';
        return `${type}${scopePart}: ${subject}`;
    },

    compress: (text) => {
        // Memory/Docs compression
        const lines = text.split('\n');
        const compressed = [];
        let currentSection = '';

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed) continue;

            // Keep headers, code, and key info
            if (/^#{1,3}\s/.test(trimmed) || /^[A-Z][A-Z_\s]+$/.test(trimmed)) {
                compressed.push(trimmed);
                currentSection = trimmed;
            } else if (/^(https?:\/\/|\.\/|\/|npm|yarn|pip|go get)/.test(trimmed)) {
                compressed.push(`🔗 ${trimmed}`);
            } else if (/^(export|import|const|let|var|function|class|interface|type)/.test(trimmed)) {
                compressed.push(`📦 ${trimmed.substring(0, 80)}`);
            } else if (trimmed.length > 10 && !/^[^a-zA-Z]*$/.test(trimmed)) {
                // Compress paragraphs to key points
                const words = trimmed.split(/\s+/);
                if (words.length > 15) {
                    compressed.push(`• ${words.slice(0, 10).join(' ')}...`);
                } else {
                    compressed.push(`• ${trimmed}`);
                }
            }
        }

        return compressed.join('\n') || text.substring(0, 200);
    }
};

// ---- Helpers ----
function extractFirstMatch(text, pattern) {
    const match = text.match(pattern);
    return match ? match[1] : null;
}

function estimateTokens(text) {
    // More accurate token estimation
    if (!text) return 0;
    // ~4 chars per token, adjusted for code/symbols
    const codeChars = (text.match(/[{}()\[\];<>]/g) || []).length;
    const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '').length;
    return Math.ceil((alphanumeric / 4.5) + (codeChars / 2));
}

// ---- Main Optimization Function ----
function optimizeText(text, mode) {
    if (!text || !text.trim()) return { optimized: '', originalTokens: 0, optimizedTokens: 0 };

    const optimizer = optimizers[mode] || optimizers.slate;
    const optimized = optimizer(text);

    return {
        optimized: optimized,
        originalTokens: estimateTokens(text),
        optimizedTokens: estimateTokens(optimized)
    };
}

// ============================================================
// UI CONTROLLER
// ============================================================

document.addEventListener('DOMContentLoaded', function () {
    const inputText = document.getElementById('inputText');
    const outputContent = document.getElementById('outputContent');
    const optimizeBtn = document.getElementById('optimizeBtn');
    const clearBtn = document.getElementById('clearBtn');
    const copyBtn = document.getElementById('copyBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const compareBtn = document.getElementById('compareBtn');
    const modeSelect = document.getElementById('optimizationMode');
    const charCount = document.getElementById('charCount');
    const wordCount = document.getElementById('wordCount');
    const originalTokens = document.getElementById('originalTokens');
    const optimizedTokens = document.getElementById('optimizedTokens');
    const compressionRate = document.getElementById('compressionRate');

    // Tabs
    const tabs = document.querySelectorAll('.tab');
    const tabContents = {
        text: document.getElementById('text-tab'),
        file: document.getElementById('file-tab')
    };
    let currentTab = 'text';

    // File upload
    const uploadZone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');
    const fileList = document.getElementById('fileList');
    let uploadedFiles = [];

    // ---- Tab Switching ----
    tabs.forEach(tab => {
        tab.addEventListener('click', function () {
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const tabName = this.dataset.tab;
            currentTab = tabName;
            Object.keys(tabContents).forEach(key => {
                tabContents[key].classList.toggle('active', key === tabName);
            });
        });
    });

    // ---- File Upload ----
    uploadZone.addEventListener('click', () => fileInput.click());

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('drag-over');
        handleFiles(e.dataTransfer.files);
    });

    fileInput.addEventListener('change', (e) => {
        handleFiles(e.target.files);
        fileInput.value = '';
    });

    function handleFiles(files) {
        for (const file of files) {
            uploadedFiles.push(file);
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target.result;
                // Append to text input
                const separator = inputText.value ? '\n---\n' : '';
                inputText.value += separator + content;
                updateCounts();
                renderFileList();
            };
            reader.readAsText(file);
        }
    }

    function renderFileList() {
        fileList.innerHTML = uploadedFiles.map((f, i) => `
            <div class="file-item">
                <span class="file-name">📄 ${f.name}</span>
                <span class="file-size">${(f.size / 1024).toFixed(1)} KB</span>
                <button class="file-remove" data-index="${i}">✕</button>
            </div>
        `).join('');

        document.querySelectorAll('.file-remove').forEach(btn => {
            btn.addEventListener('click', function () {
                const index = parseInt(this.dataset.index);
                uploadedFiles.splice(index, 1);
                renderFileList();
                // Also remove from text? For simplicity, we keep text.
            });
        });
    }

    // ---- Input Tracking ----
    inputText.addEventListener('input', updateCounts);

    function updateCounts() {
        const text = inputText.value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        charCount.textContent = chars;
        wordCount.textContent = words;
    }

    // ---- Example Buttons ----
    const examples = {
        verbose: `I inspected the authentication middleware and found that the issue appears to be caused by the token expiry check not properly rejecting expired JWTs before the request is passed to the route handler. I recommend adding a guard and then adding a regression test to ensure that this edge case is properly handled going forward. Additionally, we should update the documentation to reflect this change.`,

        'code-review': `The API endpoint implementation looks mostly good. The error handling could be improved though - we should add more specific error messages for different failure scenarios. Also, consider using a more efficient pagination strategy for large result sets. The tests cover the happy path but we should add more edge cases.`,

        debug: `Error: Connection timeout after 30 seconds while trying to reach the database. The issue is caused by the connection pool being exhausted due to long-running queries. Fix: Increase connection pool size from 10 to 25 and add query timeout of 15 seconds. Test: Added integration test that simulates concurrent connections to verify pool behavior.`,

        commit: `This is a feature that adds support for dark mode across all pages. It includes CSS variables, theme switching logic, and persists user preference in localStorage. Also updated the header and sidebar components to use the new theme system.`
    };

    document.querySelectorAll('.example-btn').forEach(btn => {
        btn.addEventListener('click', function () {
            const example = this.dataset.example;
            if (examples[example]) {
                inputText.value = examples[example];
                updateCounts();
                // Switch to text tab
                document.querySelector('.tab[data-tab="text"]').click();
            }
        });
    });

    // ---- Optimize ----
    optimizeBtn.addEventListener('click', function () {
        const text = inputText.value;
        if (!text || !text.trim()) {
            outputContent.innerHTML = '<p class="placeholder">⚠️ Please enter some text to optimize.</p>';
            return;
        }

        const mode = modeSelect.value;
        const result = optimizeText(text, mode);

        // Display output
        outputContent.textContent = result.optimized;

        // Update stats
        originalTokens.textContent = result.originalTokens;
        optimizedTokens.textContent = result.optimizedTokens;
        const rate = result.originalTokens > 0
            ? Math.round((1 - result.optimizedTokens / result.originalTokens) * 100)
            : 0;
        compressionRate.textContent = rate + '%';

        // Color code compression
        if (rate > 50) {
            compressionRate.style.color = '#4ADE80';
        } else if (rate > 20) {
            compressionRate.style.color = '#FBBF24';
        } else {
            compressionRate.style.color = '#F87171';
        }
    });

    // ---- Clear ----
    clearBtn.addEventListener('click', function () {
        inputText.value = '';
        outputContent.innerHTML = '<p class="placeholder">Your optimized output will appear here...</p>';
        originalTokens.textContent = '0';
        optimizedTokens.textContent = '0';
        compressionRate.textContent = '0%';
        updateCounts();
        uploadedFiles = [];
        fileList.innerHTML = '';
    });

    // ---- Copy ----
    copyBtn.addEventListener('click', function () {
        const text = outputContent.textContent;
        if (text && !text.includes('Your optimized output will appear here')) {
            navigator.clipboard.writeText(text).then(() => {
                const original = copyBtn.textContent;
                copyBtn.textContent = '✅';
                setTimeout(() => copyBtn.textContent = original, 2000);
            });
        }
    });

    // ---- Download ----
    downloadBtn.addEventListener('click', function () {
        const text = outputContent.textContent;
        if (text && !text.includes('Your optimized output will appear here')) {
            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `optimized-${Date.now()}.txt`;
            a.click();
            URL.revokeObjectURL(url);
        }
    });

    // ---- Compare (Show token diff) ----
    compareBtn.addEventListener('click', function () {
        const original = inputText.value;
        const optimized = outputContent.textContent;
        if (!original || !optimized || optimized.includes('Your optimized output will appear here')) {
            return;
        }

        const origTokens = estimateTokens(original);
        const optTokens = estimateTokens(optimized);
        const saved = origTokens - optTokens;
        const rate = origTokens > 0 ? Math.round((saved / origTokens) * 100) : 0;

        alert(
            `📊 Token Comparison\n\n` +
            `Original:  ${origTokens} tokens\n` +
            `Optimized: ${optTokens} tokens\n` +
            `Saved:     ${saved} tokens (${rate}% reduction)\n\n` +
            `💡 ${rate > 50 ? 'Excellent compression!' :