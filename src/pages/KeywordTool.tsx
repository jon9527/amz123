import React, { useState, useMemo, useCallback } from 'react';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#8b5cf6', '#f59e0b', '#06b6d4', '#dc2626', '#6366f1'];

interface RootData {
    root: string;
    keywords: string[];
    color: string;
    subCounts: Record<string, number>;
    corePrediction: string;
}

interface GlobalData {
    [keyword: string]: string[];
}

const KeywordTool: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [filterStop, setFilterStop] = useState(true);
    const [rootsData, setRootsData] = useState<RootData[]>([]);
    const [globalData, setGlobalData] = useState<GlobalData>({});
    const [columnFilters, setColumnFilters] = useState<Record<string, string | null>>({});
    const [modalOpen, setModalOpen] = useState(false);
    const [modalKeyword, setModalKeyword] = useState('');
    const [modalRoots, setModalRoots] = useState<string[]>([]);
    const [toast, setToast] = useState<string | null>(null);

    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 1200);
    }, []);

    const copyText = useCallback((text: string) => {
        navigator.clipboard.writeText(text).then(() => showToast("已复制: " + text));
    }, [showToast]);

    const renderBoard = useCallback(() => {
        if (!inputText.trim()) return;

        const stopWords = new Set(['a', 'an', 'the', 'is', 'are', 'am']);
        const lines = inputText.split('\n').filter(l => l.trim().length > 0);
        const rootMap: Record<string, string[]> = {};
        const rootCounts: Record<string, number> = {};
        const newGlobalData: GlobalData = {};

        // Parse data
        lines.forEach(line => {
            const cleanLine = line.trim();
            const words = cleanLine.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
            const uniqueWords = new Set<string>(words);

            uniqueWords.forEach((w: string) => {
                if (w.length < 2) return;
                if (filterStop && stopWords.has(w)) return;
                if (!rootMap[w]) { rootMap[w] = []; rootCounts[w] = 0; }
                rootMap[w].push(cleanLine);
                rootCounts[w]++;
            });
            newGlobalData[cleanLine] = Array.from(uniqueWords).filter((w: string) =>
                w.length >= 2 && (!filterStop || !stopWords.has(w))
            );
        });

        // Sort roots by frequency
        const sortedRoots = Object.keys(rootCounts).sort((a, b) => rootCounts[b] - rootCounts[a]);

        // Build roots data
        const newRootsData: RootData[] = sortedRoots.map((root, index) => {
            const color = COLORS[index % COLORS.length];
            const keywords = rootMap[root];

            // Sub-word frequency
            const subCounts: Record<string, number> = {};
            keywords.forEach(kw => {
                const words = kw.toLowerCase().replace(/[^\w\s]/gi, '').split(/\s+/);
                words.forEach(w => {
                    if (normalize(w) !== normalize(root) && !stopWords.has(w) && w.length > 1) {
                        subCounts[w] = (subCounts[w] || 0) + 1;
                    }
                });
            });

            const topAttrs = Object.keys(subCounts).sort((a, b) => subCounts[b] - subCounts[a]);
            const topPartner = topAttrs[0];

            // Find core prediction
            let corePrediction = root;
            if (topPartner) {
                const candidates = keywords.filter(kw => {
                    const normKw = normalize(kw);
                    return normKw.includes(normalize(root)) && normKw.includes(normalize(topPartner));
                });
                if (candidates.length > 0) {
                    candidates.sort((a, b) => a.length - b.length);
                    corePrediction = candidates[0];
                } else {
                    corePrediction = `${root} ${topPartner}`;
                }
            }

            return { root, keywords, color, subCounts, corePrediction };
        });

        setRootsData(newRootsData);
        setGlobalData(newGlobalData);
        setColumnFilters({});
    }, [inputText, filterStop]);

    const exportToCSV = useCallback(() => {
        if (rootsData.length === 0) return;
        let csv = "\uFEFF";
        const roots = rootsData.map(r => r.root);
        csv += roots.join(",") + "\n";
        let max = 0;
        rootsData.forEach(r => max = Math.max(max, r.keywords.length));
        for (let i = 0; i < max; i++) {
            csv += rootsData.map(r => `"${(r.keywords[i] || "").replace(/"/g, '""')}"`).join(",") + "\n";
        }
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "amazon_analysis.csv";
        link.click();
    }, [rootsData]);

    const toggleFilter = useCallback((root: string, filterWord: string) => {
        setColumnFilters(prev => {
            const current = prev[root];
            if (current === filterWord) {
                return { ...prev, [root]: null };
            }
            return { ...prev, [root]: filterWord };
        });
    }, []);

    const openModal = useCallback((keyword: string) => {
        setModalKeyword(keyword);
        setModalRoots(globalData[keyword] || []);
        setModalOpen(true);
    }, [globalData]);

    const jumpToColumn = useCallback((root: string) => {
        setModalOpen(false);
        const el = document.getElementById('col-' + normalize(root));
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', inline: 'center' });
            el.classList.add('ring-2', 'ring-blue-500');
            setTimeout(() => el.classList.remove('ring-2', 'ring-blue-500'), 1500);
        }
    }, []);

    const copyColumn = useCallback((root: string) => {
        const rootData = rootsData.find(r => r.root === root);
        if (!rootData) return;
        const filterWord = columnFilters[root];
        let words = rootData.keywords;
        if (filterWord) {
            words = words.filter(kw => kw.toLowerCase().includes(filterWord.toLowerCase()));
        }
        navigator.clipboard.writeText(words.join('\n')).then(() => showToast(`已复制 ${words.length} 个关键词`));
    }, [rootsData, columnFilters, showToast]);

    return (
        <div className="flex h-full overflow-hidden bg-[#0c0c0e]">
            {/* Sidebar */}
            <div className="w-64 bg-[#18181b] border-r border-[#27272a] flex flex-col p-4 flex-shrink-0">
                <h2 className="text-base font-black text-blue-400 mb-4 flex items-center gap-2">
                    <span>🚩</span> 关键词透视 v1.0
                </h2>

                <div className="flex-1 flex flex-col mb-3">
                    <textarea
                        value={inputText}
                        onChange={e => setInputText(e.target.value)}
                        placeholder="在此粘贴海量关键词..."
                        className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg p-3 resize-none text-white font-mono text-xs focus:border-blue-500 focus:outline-none"
                    />
                </div>

                <label className="flex items-center gap-2 text-xs text-zinc-400 mb-3 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={filterStop}
                        onChange={e => setFilterStop(e.target.checked)}
                        className="accent-blue-500"
                    />
                    仅过滤冠词 (a, an, the)
                </label>

                <button
                    onClick={renderBoard}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg mb-2 text-sm transition-colors"
                >
                    ⚡ 开始透视
                </button>
                <button
                    onClick={exportToCSV}
                    className="w-full py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold rounded-lg text-sm border border-zinc-700 transition-colors"
                >
                    📥 下载表格
                </button>

                <div className="mt-4 text-xs text-zinc-500 leading-relaxed">
                    <strong className="text-zinc-400">v1.0 功能：</strong><br />
                    1. <strong>👑 真实核心</strong> - 算法寻找最优短语<br />
                    2. <strong>🖱️ 标签筛选</strong> - 点击属性标签过滤<br />
                    3. <strong>📍 交互完备</strong> - 跳转/复制/查重
                </div>
            </div>

            {/* Board */}
            <div className="flex-1 overflow-x-auto p-4 flex gap-4 items-start">
                {rootsData.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-zinc-600 text-sm">
                        请在左侧输入关键词后点击"开始透视"
                    </div>
                ) : (
                    rootsData.map((rd) => (
                        <Column
                            key={rd.root}
                            data={rd}
                            globalData={globalData}
                            sortedRoots={rootsData.map(r => r.root)}
                            activeFilter={columnFilters[rd.root] || null}
                            onToggleFilter={(word) => toggleFilter(rd.root, word)}
                            onOpenModal={openModal}
                            onCopyColumn={() => copyColumn(rd.root)}
                            onCopyText={copyText}
                        />
                    ))
                )}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div
                    className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
                    onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}
                >
                    <div className="bg-[#18181b] w-[420px] rounded-xl border border-[#27272a] shadow-2xl">
                        <div className="px-5 py-4 border-b border-[#27272a] flex justify-between items-center">
                            <span className="font-bold text-white">关键词详情</span>
                            <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white text-xl">×</button>
                        </div>
                        <div className="p-5">
                            <div className="text-xs text-zinc-500 mb-1">当前关键词：</div>
                            <div className="bg-[#09090b] border border-[#27272a] rounded-lg p-3 text-center font-mono font-bold text-white mb-4 select-all">
                                {modalKeyword}
                            </div>
                            <div className="text-xs text-zinc-500 mb-2">包含以下词根 (点击跳转)：</div>
                            <div className="flex flex-wrap gap-2 mb-4">
                                {modalRoots.map(r => {
                                    const idx = rootsData.findIndex(rd => rd.root === r);
                                    const color = idx !== -1 ? COLORS[idx % COLORS.length] : '#666';
                                    return (
                                        <button
                                            key={r}
                                            onClick={() => jumpToColumn(r)}
                                            className="px-3 py-1.5 rounded text-white text-sm font-bold hover:scale-105 transition-transform"
                                            style={{ backgroundColor: color }}
                                        >
                                            {r} →
                                        </button>
                                    );
                                })}
                            </div>
                            <div className="text-right pt-4 border-t border-[#27272a]">
                                <button
                                    onClick={() => copyText(modalKeyword)}
                                    className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm border border-zinc-700"
                                >
                                    📄 复制关键词
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Toast */}
            {toast && (
                <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/80 text-white px-5 py-2.5 rounded-full font-bold text-sm z-50 animate-pulse">
                    {toast}
                </div>
            )}
        </div>
    );
};

// Column component
const Column: React.FC<{
    data: RootData;
    globalData: GlobalData;
    sortedRoots: string[];
    activeFilter: string | null;
    onToggleFilter: (word: string) => void;
    onOpenModal: (keyword: string) => void;
    onCopyColumn: () => void;
    onCopyText: (text: string) => void;
}> = ({ data, globalData, sortedRoots: _sortedRoots, activeFilter, onToggleFilter, onOpenModal, onCopyColumn, onCopyText }) => {
    const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');
    const { root, keywords, color, subCounts, corePrediction } = data;

    const topAttrs = useMemo(() =>
        Object.keys(subCounts).sort((a, b) => subCounts[b] - subCounts[a]).slice(0, 5),
        [subCounts]
    );

    const filteredKeywords = useMemo(() => {
        let kws = activeFilter
            ? keywords.filter(kw => kw.toLowerCase().includes(activeFilter.toLowerCase()))
            : keywords;

        // Sort: position > alphabetical
        return kws.sort((a, b) => {
            const wordsA = a.split(/\s+/);
            const wordsB = b.split(/\s+/);
            let idxA = wordsA.findIndex(w => normalize(w).includes(normalize(root)));
            let idxB = wordsB.findIndex(w => normalize(w).includes(normalize(root)));
            if (idxA === -1) idxA = 0;
            if (idxB === -1) idxB = 0;
            if (idxA !== idxB) return idxA - idxB;
            return a.localeCompare(b);
        });
    }, [keywords, activeFilter, root]);

    return (
        <div
            id={'col-' + normalize(root)}
            className="w-[420px] min-w-[420px] bg-[#18181b] border border-[#27272a] rounded-xl flex flex-col max-h-full transition-all"
        >
            {/* Header */}
            <div
                className="px-3 py-2.5 bg-[#09090b] rounded-t-xl flex justify-between items-center border-b-4"
                style={{ borderBottomColor: color }}
            >
                <span className="font-bold text-white">
                    {root} <span className="text-zinc-500 font-normal text-sm ml-1">{keywords.length}</span>
                </span>
                <button
                    onClick={onCopyColumn}
                    className="text-zinc-500 hover:text-white text-sm px-2 py-1 hover:bg-zinc-800 rounded"
                    title="复制整列"
                >
                    📋
                </button>
            </div>

            {/* Analysis Panel */}
            <div className="px-3 py-2 border-b border-[#27272a] bg-[#0d0d0f]">
                <div
                    className="bg-amber-500/10 border border-amber-500/30 rounded px-3 py-2 flex justify-between items-center mb-2 cursor-pointer hover:bg-amber-500/20"
                    onClick={() => onCopyText(corePrediction)}
                    title="点击复制"
                >
                    <span className="text-[10px] text-amber-500 font-bold uppercase">👑 真实核心</span>
                    <span className="text-sm font-bold text-white">{corePrediction}</span>
                </div>
                <div className="flex flex-wrap gap-1">
                    {topAttrs.map(w => (
                        <button
                            key={w}
                            onClick={() => onToggleFilter(w)}
                            className={`text-[11px] px-2 py-1 rounded border transition-colors ${activeFilter === w
                                ? 'bg-blue-500/20 border-blue-500 text-blue-400 font-bold'
                                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-500'
                                }`}
                        >
                            {w} <span className="opacity-60">{subCounts[w]}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {filteredKeywords.map((kw, i) => {
                    const wordsArr = kw.split(/\s+/);
                    const rootIdx = wordsArr.findIndex(w => normalize(w).includes(normalize(root)));
                    const rootsBelonging = globalData[kw] || [];

                    return (
                        <div
                            key={i}
                            onClick={() => onOpenModal(kw)}
                            className="grid grid-cols-6 gap-0.5 bg-[#09090b] rounded p-1 pr-7 relative cursor-pointer hover:bg-zinc-800 hover:shadow-lg group transition-all"
                        >
                            {[0, 1, 2, 3, 4, 5].map(j => {
                                const word = wordsArr[j];
                                const isRoot = j === rootIdx;
                                return (
                                    <div
                                        key={j}
                                        className={`h-6 flex items-center justify-center text-[11px] rounded truncate px-1 ${word ? (isRoot ? 'text-white font-bold' : 'text-zinc-400 bg-zinc-800/50') : ''
                                            }`}
                                        style={isRoot && word ? { backgroundColor: color } : {}}
                                        title={word || ''}
                                    >
                                        {word || ''}
                                    </div>
                                );
                            })}

                            {/* Copy button */}
                            <button
                                onClick={e => { e.stopPropagation(); onCopyText(kw); }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded bg-zinc-800 border border-zinc-700 text-zinc-500 opacity-0 group-hover:opacity-100 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all"
                                title="复制"
                            >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                </svg>
                            </button>

                            {/* Dup badge */}
                            {rootsBelonging.length > 1 && (
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-[#18181b]">
                                    {rootsBelonging.length}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default KeywordTool;
