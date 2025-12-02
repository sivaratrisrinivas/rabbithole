import { useState, useCallback, useEffect, useRef } from 'react';
import {
    ReactFlow,
    ReactFlowProvider,
    MiniMap,
    Controls,
    Background,
    useNodesState,
    useEdgesState,
    addEdge,
    BackgroundVariant,
    Panel,
    useReactFlow,
    type Connection,
    type Node
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { Download } from 'lucide-react';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { transformDataToGraph } from "@/lib/graph-utils";

// Initial placeholder - clean and minimal
const initialNodes = [
    { 
        id: 'ready', 
        position: { x: 0, y: 0 }, 
        data: { label: 'RabbitHole', type: 'ready' },
        style: {
            background: 'rgba(255, 255, 255, 0.06)',
            color: '#ffffff',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            width: 260,
            borderRadius: '16px',
            padding: '32px 36px',
            boxShadow: '0 2px 16px rgba(0, 0, 0, 0.2)',
            fontWeight: '400',
            fontSize: '18px',
            letterSpacing: '-0.01em',
        },
    },
];
const initialEdges: any[] = [];

function FlowContent({ shouldFitView, centerInitial, nodes, searchBarRef }: { shouldFitView: boolean; centerInitial: boolean; nodes: Node[]; searchBarRef: React.RefObject<HTMLDivElement> }) {
    const { fitView, getNodesBounds, setViewport, getViewport } = useReactFlow();

    useEffect(() => {
        if (shouldFitView) {
            // Increased delay to ensure nodes are fully rendered and positioned
            setTimeout(() => {
                // Find report node by type (not ID, since ID is now dynamic with timestamp)
                const reportNode = nodes.find(n => n.data?.type === 'report');
                const nodesWithoutReport = nodes.filter(n => n.data?.type !== 'report');
                
                // Debug logging
                console.log('🔍 [DEBUG] fitView called:', {
                    totalNodes: nodes.length,
                    nodesWithoutReport: nodesWithoutReport.length,
                    reportNode: reportNode,
                    reportNodeId: reportNode?.id,
                    reportNodePosition: reportNode?.position,
                    nodesToFit: nodesWithoutReport.map(n => ({ id: n.id, type: n.data?.type, y: n.position.y }))
                });
                
                // Use fitView to get optimal zoom, then adjust to show root at top
                if (nodes.length > 0 && reportNode) {
                    const rootNode = nodes.find(n => n.data?.type === 'root');
                    if (!rootNode) {
                        fitView({ padding: 0.2, duration: 400 });
                        return;
                    }
                    
                    // Step 1: Use fitView to get optimal zoom (fits all nodes)
                    fitView({ padding: 0.15, duration: 0, maxZoom: 1.0, minZoom: 0.1 });
                    
                    // Step 2: Adjust viewport Y to position root directly below search bar
                    setTimeout(() => {
                        const currentViewport = getViewport();
                        // Calculate actual search bar bottom position dynamically
                        // Default to 240px if search bar ref not available
                        let topPadding = 240;
                        if (searchBarRef?.current) {
                            const searchBarRect = searchBarRef.current.getBoundingClientRect();
                            topPadding = searchBarRect.bottom + 20; // Add 20px spacing below search bar
                        }
                        const viewportHeight = window.innerHeight;
                        
                        // Calculate where root currently appears on screen after fitView
                        const rootCurrentScreenY = (rootNode.position.y - currentViewport.y) * currentViewport.zoom;
                        
                        // Shift viewport up so root appears at topPadding (right below search bar)
                        const shiftY = (rootCurrentScreenY - topPadding) / currentViewport.zoom;
                        const adjustedY = currentViewport.y + shiftY;
                        
                        // Verify report will be visible
                        const reportScreenY = (reportNode.position.y - adjustedY) * currentViewport.zoom;
                        const reportVisible = reportScreenY > topPadding && reportScreenY < viewportHeight - 60;
                        
                        console.log('🔍 [DEBUG] Adjusting viewport:', {
                            currentViewport,
                            rootCurrentScreenY,
                            shiftY,
                            adjustedY,
                            reportScreenY,
                            reportVisible,
                            rootY: rootNode.position.y,
                            reportY: reportNode.position.y
                        });
                        
                        // Set adjusted viewport
                        setViewport({ 
                            x: currentViewport.x, 
                            y: adjustedY, 
                            zoom: currentViewport.zoom 
                        }, { duration: 600 });
                        
                        // Final check to ensure viewport stuck
                        setTimeout(() => {
                            const finalViewport = getViewport();
                            const finalRootScreenY = (rootNode.position.y - finalViewport.y) * finalViewport.zoom;
                            const finalReportScreenY = (reportNode.position.y - finalViewport.y) * finalViewport.zoom;
                            
                            console.log('🔍 [DEBUG] Final viewport check:', {
                                finalViewport,
                                finalRootScreenY,
                                finalReportScreenY,
                                rootVisible: finalRootScreenY >= topPadding - 50 && finalRootScreenY <= topPadding + 50,
                                reportVisible: finalReportScreenY > topPadding && finalReportScreenY < viewportHeight
                            });
                            
                            // If viewport was reset, reapply
                            if (Math.abs(finalViewport.y - adjustedY) > 50) {
                                console.warn('🔍 [DEBUG] Viewport was reset, reapplying...');
                                setViewport({ 
                                    x: currentViewport.x, 
                                    y: adjustedY, 
                                    zoom: currentViewport.zoom 
                                }, { duration: 0 });
                            }
                        }, 700);
                    }, 150);
                } else {
                    fitView({ padding: 0.2, duration: 400 });
                }
            }, 400); // Wait for nodes to render
        }
    }, [shouldFitView, fitView, getNodesBounds, setViewport, getViewport, nodes]);

    useEffect(() => {
        // Only center initial node if we don't have research nodes yet
        if (centerInitial && nodes.length <= 1) {
            // Center the initial node on mount (only for the "RabbitHole" placeholder)
            setTimeout(() => {
                fitView({ 
                    padding: 0.4, 
                    duration: 800,
                    maxZoom: 1.2,
                    minZoom: 0.8
                });
            }, 300);
        }
    }, [centerInitial, fitView, nodes.length]);

    return null;
}

export default function ResearchGraph() {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedNode, setSelectedNode] = useState<Node | null>(null);
    const [shouldFitView, setShouldFitView] = useState(false);
    const [centerInitial, setCenterInitial] = useState(true);
    const [researchData, setResearchData] = useState<any>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const searchBarRef = useRef<HTMLDivElement>(null);
    
    // Debug: Monitor node position changes
    useEffect(() => {
        const reportNode = nodes.find(n => n.data?.type === 'report');
        if (reportNode) {
            console.log('🔍 [DEBUG] Report node position in state:', {
                id: reportNode.id,
                type: reportNode.data?.type,
                position: reportNode.position,
                allNodes: nodes.map(n => ({ id: n.id, type: n.data?.type, y: n.position.y }))
            });
        }
    }, [nodes]);

    const onConnect = useCallback(
        (params: Connection) => setEdges((eds) => addEdge(params, eds)),
        [setEdges],
    );

    const handleResearch = async () => {
        if (!query.trim()) return;
        setLoading(true);
        setSelectedNode(null);
        console.log("🚀 Sending query to RabbitHole Server:", query);

        try {
            const response = await fetch('http://localhost:3000/api/research', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log("✅ Received Data from Firecrawl:", data);

            // Transform Firecrawl data into graph nodes and edges
            const { nodes: newNodes, edges: newEdges } = transformDataToGraph(query, data);
            
            // Debug logging
            const reportNodeAfterTransform = newNodes.find(n => n.data?.type === 'report');
            console.log('🔍 [DEBUG] After transformDataToGraph:', {
              totalNodes: newNodes.length,
              reportNode: reportNodeAfterTransform,
              reportNodeId: reportNodeAfterTransform?.id,
              reportNodePosition: reportNodeAfterTransform?.position,
              allNodePositions: newNodes.map(n => ({ id: n.id, type: n.data?.type, position: n.position })),
              maxY: Math.max(...newNodes.map(n => n.position.y)),
              minY: Math.min(...newNodes.map(n => n.position.y)),
              rootNode: newNodes.find(n => n.data?.type === 'root'),
              sourceNodes: newNodes.filter(n => n.data?.type === 'source').length
            });
            
            // Verify node positions before setting
            const rootNodeCheck = newNodes.find(n => n.data?.type === 'root');
            const reportNodeCheck = newNodes.find(n => n.data?.type === 'report');
            console.log('🔍 [DEBUG] Before setNodes - Node positions:', {
                rootPosition: rootNodeCheck?.position,
                reportPosition: reportNodeCheck?.position,
                reportId: reportNodeCheck?.id,
                verticalDistance: reportNodeCheck && rootNodeCheck 
                    ? reportNodeCheck.position.y - rootNodeCheck.position.y 
                    : null,
                isReportBelowRoot: reportNodeCheck && rootNodeCheck
                    ? reportNodeCheck.position.y > rootNodeCheck.position.y
                    : false
            });
            
            setNodes(newNodes);
            setEdges(newEdges);
            setResearchData(data); // Store research data for PDF export
            setCenterInitial(false); // Disable centerInitial before setting shouldFitView
            // Small delay to ensure centerInitial is disabled
            setTimeout(() => {
                setShouldFitView(true);
            }, 50);

        } catch (error) {
            console.error("❌ Error fetching research:", error);
            alert(`Error: ${error instanceof Error ? error.message : 'Failed to fetch research'}`);
        } finally {
            setLoading(false);
        }
    };

    const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
        setSelectedNode(node);
    }, []);

    // Convert markdown to plain text for PDF
    const convertMarkdownToPlainText = (markdown: string): string => {
        let text = markdown;
        
        // Remove markdown headers (keep text, remove #)
        text = text.replace(/^#+\s+(.+)$/gm, '$1');
        
        // Remove image markdown first
        text = text.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
        
        // Convert markdown links to plain text: [text](url) -> text (url) but skip navigation links
        text = text.replace(/\[([^\]]+)\]\(([^\)]+)\)/g, (match, linkText, url) => {
            const lowerText = linkText.toLowerCase();
            // Skip navigation and UI elements
            if (lowerText.includes('hide') || lowerText.includes('jump') || lowerText.includes('log') || 
                lowerText.includes('sign') || lowerText.includes('skip') || lowerText.includes('search') ||
                lowerText.includes('back') || lowerText.includes('menu') || lowerText.includes('more') ||
                lowerText.includes('open in') || lowerText.includes('write') || lowerText.includes('sitemap') ||
                lowerText.includes('try again') || lowerText.includes('wait') || lowerText.includes('logo') ||
                lowerText.includes('youtube') || lowerText.includes('watch') || lowerText.includes('share')) {
                return '';
            }
            // For source URLs, just show the URL
            if (linkText === url || linkText.startsWith('http')) {
                return url;
            }
            return `${linkText} (${url})`;
        });
        
        // Remove markdown bold/italic but keep text
        text = text.replace(/\*\*([^\*]+)\*\*/g, '$1');
        text = text.replace(/\*([^\*]+)\*/g, '$1');
        text = text.replace(/__([^_]+)__/g, '$1');
        text = text.replace(/_([^_]+)_/g, '$1');
        
        // Remove horizontal rules
        text = text.replace(/^[\*\-_=]{3,}$/gm, '');
        text = text.replace(/^---+$/gm, '');
        
        // Remove code blocks
        text = text.replace(/```[\s\S]*?```/g, '');
        text = text.replace(/`([^`]+)`/g, '$1');
        
        // Remove blockquotes
        text = text.replace(/^>\s+(.+)$/gm, '$1');
        
        // Remove ads and promotional content
        text = text.replace(/Advertisement.*?Remove Ads/gi, '');
        text = text.replace(/Want to remove ads\?.*?Premium Member/gi, '');
        
        // Remove error messages
        text = text.replace(/Error \d+ \(.*?\)!!?\d*/gi, '');
        text = text.replace(/The page you were looking for.*?never existed/gi, '');
        text = text.replace(/Something went wrong.*?try again/gi, '');
        text = text.replace(/404/gi, '');
        text = text.replace(/reCAPTCHA.*?verification/gi, '');
        
        // Remove navigation and UI text
        text = text.replace(/Skip to content|Skip to search|Go to.*?Home/gi, '');
        text = text.replace(/From Wikipedia, the free encyclopedia/gi, '');
        text = text.replace(/Try searching for what you're looking for/gi, '');
        text = text.replace(/browse some of our favourites below/gi, '');
        
        // Remove YouTube and video related text
        text = text.replace(/Prefer a video version.*?Watch here!/gi, '');
        text = text.replace(/If playback doesn't begin shortly.*?restarting your device/gi, '');
        text = text.replace(/You're signed out.*?Videos/gi, '');
        text = text.replace(/Watch later|Share|Copy link|Info|Shopping|Tap to unmute/gi, '');
        text = text.replace(/More videos/gi, '');
        
        // Remove lines that are just URLs or special characters
        text = text.split('\n')
            .filter(line => {
                const trimmed = line.trim();
                return trimmed.length > 3 && 
                       !trimmed.match(/^https?:\/\/[^\s]*$/) &&
                       !trimmed.match(/^[\*\-_=\s]+$/) &&
                       !trimmed.match(/^[^\w\s]+$/);
            })
            .join('\n');
        
        // Clean up multiple newlines
        text = text.replace(/\n{3,}/g, '\n\n');
        
        return text.trim();
    };

    const handleDownloadPDF = async () => {
        if (!researchData || !query) {
            alert('No research data available to download');
            return;
        }

        try {
            const pdf = new jsPDF();
            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();
            const margin = 20;
            let yPosition = margin;

            // Helper to add a new page if needed
            const checkPageBreak = (requiredHeight: number) => {
                if (yPosition + requiredHeight > pageHeight - margin) {
                    pdf.addPage();
                    yPosition = margin;
                }
            };

            // Title
            pdf.setFontSize(20);
            pdf.setFont('helvetica', 'bold');
            pdf.text('RabbitHole Research Report', margin, yPosition);
            yPosition += 15;

            // Query
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'normal');
            pdf.text(`Research Query: ${query}`, margin, yPosition);
            yPosition += 10;

            // Date
            pdf.setFontSize(10);
            pdf.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
            yPosition += 15;

            // Sources
            const sources = researchData.data?.web || researchData.data || [];
            if (sources.length > 0) {
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Sources', margin, yPosition);
                yPosition += 10;

                sources.forEach((source: any, index: number) => {
                    checkPageBreak(30);
                    
                    pdf.setFontSize(12);
                    pdf.setFont('helvetica', 'bold');
                    const title = source.title || (source.url ? new URL(source.url).hostname : '') || `Source ${index + 1}`;
                    const titleLines = pdf.splitTextToSize(title, pageWidth - 2 * margin);
                    pdf.text(titleLines, margin, yPosition);
                    yPosition += titleLines.length * 6;

                    if (source.url) {
                        pdf.setFontSize(9);
                        pdf.setFont('helvetica', 'italic');
                        pdf.setTextColor(100, 100, 100);
                        const urlLines = pdf.splitTextToSize(source.url, pageWidth - 2 * margin);
                        pdf.text(urlLines, margin, yPosition);
                        pdf.setTextColor(0, 0, 0);
                        yPosition += urlLines.length * 5;
                    }

                    // Use proper API structure: markdown (scraped) > description > metadata.description
                    let content = '';
                    if (source.markdown) {
                        content = convertMarkdownToPlainText(source.markdown);
                    } else if (source.description) {
                        content = source.description;
                    } else if (source.metadata?.description) {
                        content = source.metadata.description;
                    }
                    
                    if (content) {
                        const cleanedContent = convertMarkdownToPlainText(content);
                        const preview = cleanedContent.length > 400 
                            ? cleanedContent.substring(0, 400) + '...' 
                            : cleanedContent;
                        
                        pdf.setFontSize(10);
                        pdf.setFont('helvetica', 'normal');
                        const contentLines = pdf.splitTextToSize(preview, pageWidth - 2 * margin);
                        pdf.text(contentLines, margin, yPosition);
                        yPosition += contentLines.length * 5;
                    }

                    yPosition += 8;
                });
            }

            // Final Report - Convert markdown to clean plain text
            const reportNode = nodes.find(n => n.data.type === 'report');
            if (reportNode?.data.details) {
                checkPageBreak(20);
                yPosition += 10;
                pdf.setFontSize(16);
                pdf.setFont('helvetica', 'bold');
                pdf.text('Final Report', margin, yPosition);
                yPosition += 12;

                pdf.setFontSize(11);
                pdf.setFont('helvetica', 'normal');
                
                // Convert markdown to plain text for PDF
                const markdownText = typeof reportNode.data.details === 'string' 
                    ? reportNode.data.details 
                    : JSON.stringify(reportNode.data.details, null, 2);
                
                const plainText = convertMarkdownToPlainText(markdownText);
                const reportLines = pdf.splitTextToSize(plainText, pageWidth - 2 * margin);
                
                reportLines.forEach((line: string) => {
                    checkPageBreak(6);
                    pdf.text(line, margin, yPosition);
                    yPosition += 6;
                });
            }

            // Save PDF
            const filename = `rabbithole-research-${query.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${Date.now()}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    // Reset fitView trigger after it's been used
    useEffect(() => {
        if (shouldFitView) {
            const timer = setTimeout(() => setShouldFitView(false), 500);
            return () => clearTimeout(timer);
        }
    }, [shouldFitView]);

    return (
        <div style={{ 
            width: '100vw', 
            height: '100vh', 
            background: '#000000',
            position: 'relative',
            overflow: 'hidden',
        }}>
            
            <ReactFlowProvider>
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                colorMode="dark"
                style={{ 
                    background: 'transparent',
                    height: '100%'
                }}
            >
                <FlowContent shouldFitView={shouldFitView} centerInitial={centerInitial} nodes={nodes} searchBarRef={searchBarRef} />
                <Controls 
                    style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        padding: '6px',
                        backdropFilter: 'blur(20px)',
                    }}
                />
                <MiniMap 
                    style={{
                        background: 'rgba(0, 0, 0, 0.6)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '12px',
                        backdropFilter: 'blur(20px)',
                    }}
                    nodeColor={(node) => {
                        if (node.data?.type === 'root') return 'rgba(255, 255, 255, 0.3)';
                        if (node.data?.type === 'report') return 'rgba(0, 122, 255, 0.4)';
                        return 'rgba(255, 255, 255, 0.15)';
                    }}
                />
                <Background 
                    variant={BackgroundVariant.Dots} 
                    gap={32} 
                    size={1}
                    color="rgba(255, 255, 255, 0.02)"
                />

                <Panel position="top-center" className="w-full max-w-2xl mx-auto mt-12 z-10 px-6">
                    <div ref={searchBarRef} className="flex flex-col items-center gap-8">
                        <div className="text-center space-y-3">
                            <h1 className="text-5xl font-light text-white" style={{ letterSpacing: '-0.03em' }}>
                                RabbitHole
                            </h1>
                            <p className="text-white/50 text-sm font-light">
                                Discover knowledge through exploration
                            </p>
                        </div>
                        <div className="flex gap-3 w-full items-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5">
                            <Input
                                placeholder="What would you like to explore?"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="bg-transparent border-0 text-white placeholder:text-white/40 flex-1 h-12 text-base rounded-xl px-5 focus-visible:ring-0 focus-visible:ring-offset-0 font-light"
                                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                                disabled={loading}
                            />
                            <Button
                                onClick={handleResearch}
                                disabled={loading || !query.trim()}
                                className="bg-white text-black hover:bg-white/90 h-12 px-8 rounded-xl font-medium text-sm disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                                        <span>Exploring</span>
                                    </span>
                                ) : (
                                    'Explore'
                                )}
                            </Button>
                        </div>
                    </div>
                </Panel>

                {selectedNode && (
                    <Panel position="top-right" className="w-full max-w-2xl mt-20 mr-8 z-20 px-4">
                        <div 
                            ref={sidebarRef}
                            className="bg-black/80 backdrop-blur-2xl border border-white/10 rounded-2xl p-8 max-h-[85vh] overflow-y-auto scrollbar-thin"
                        >
                            <div className="flex justify-between items-start mb-8 sticky top-0 bg-black/80 backdrop-blur-xl pb-6 -mx-2 px-2 z-10 border-b border-white/10">
                                <div className="flex-1 pr-6">
                                    <h3 className="text-3xl font-light text-white mb-2" style={{ letterSpacing: '-0.02em' }}>
                                        {selectedNode.data.label}
                                    </h3>
                                    <p className="text-white/40 text-xs font-light uppercase tracking-wider">
                                        {selectedNode.data.type || 'node'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-3">
                                    {researchData && selectedNode.data.type === 'report' && (
                                        <Button
                                            onClick={handleDownloadPDF}
                                            size="sm"
                                            className="bg-white text-black hover:bg-white/90 h-9 px-5 rounded-xl text-xs font-medium transition-all"
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            PDF
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedNode(null)}
                                        className="text-white/40 hover:text-white/80 hover:bg-white/5 h-9 w-9 p-0 rounded-xl text-xl font-light transition-all"
                                    >
                                        ×
                                    </Button>
                                </div>
                            </div>
                            
                            {selectedNode.data.url && (
                                <a
                                    href={selectedNode.data.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-sm text-white/50 hover:text-white/70 mb-6 block break-all underline decoration-white/20 hover:decoration-white/40 transition-colors font-light"
                                >
                                    {selectedNode.data.url}
                                </a>
                            )}
                            
                            <div className="text-base text-white/80 space-y-4 leading-relaxed">
                                {selectedNode.data.details && (
                                    <div className="prose prose-invert max-w-none">
                                        {typeof selectedNode.data.details === 'string' ? (
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({node, ...props}) => <h1 className="text-white text-2xl font-light mb-6 mt-8 pb-3 border-b border-white/10" style={{ letterSpacing: '-0.02em' }} {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="text-white text-xl font-light mb-5 mt-7" style={{ letterSpacing: '-0.01em' }} {...props} />,
                                                    h3: ({node, ...props}) => <h3 className="text-white text-lg font-light mb-4 mt-6" {...props} />,
                                                    p: ({node, ...props}) => <p className="text-white/70 leading-relaxed mb-5 font-light" {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc list-outside text-white/70 mb-5 ml-6 space-y-2 font-light" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal list-outside text-white/70 mb-5 ml-6 space-y-2 font-light" {...props} />,
                                                    li: ({node, ...props}) => <li className="ml-2 text-white/70 leading-relaxed font-light" {...props} />,
                                                    code: ({node, inline, ...props}: any) => 
                                                        inline ? (
                                                            <code className="bg-white/10 text-white px-2 py-0.5 rounded text-sm font-mono font-normal" {...props} />
                                                        ) : (
                                                            <code className="block bg-white/5 text-white/90 p-4 rounded-xl text-sm overflow-x-auto mb-5 font-mono font-light" {...props} />
                                                        ),
                                                    pre: ({node, ...props}) => <pre className="bg-white/5 text-white/90 p-4 rounded-xl text-sm overflow-x-auto mb-5 font-mono font-light" {...props} />,
                                                    a: ({node, ...props}: any) => <a className="text-white/60 hover:text-white underline decoration-white/30 hover:decoration-white/50 font-light transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    blockquote: ({node, ...props}) => <blockquote className="border-l border-white/20 pl-5 italic text-white/60 mb-5 my-5 font-light" {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-medium text-white" {...props} />,
                                                    em: ({node, ...props}) => <em className="italic text-white/80 font-light" {...props} />,
                                                    hr: ({node, ...props}) => <hr className="border-white/10 my-8" {...props} />,
                                                }}
                                            >
                                                {selectedNode.data.details}
                                            </ReactMarkdown>
                                        ) : (
                                            <pre className="text-sm overflow-auto bg-white/5 text-white/80 p-4 rounded-xl border border-white/10 font-light">
                                                {JSON.stringify(selectedNode.data.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Panel>
                )}
            </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}