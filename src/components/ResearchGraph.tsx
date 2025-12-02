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

// Initial placeholder state - centered node (Dark Teenage Engineering style)
const initialNodes = [
    { 
        id: 'ready', 
        position: { x: 0, y: 0 }, 
        data: { label: 'RabbitHole', type: 'ready' },
        style: {
            background: 'rgba(255, 255, 255, 0.05)',
            color: '#ffffff',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            width: 240,
            borderRadius: '12px',
            padding: '24px 28px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            fontWeight: '600',
            fontSize: '18px',
            letterSpacing: '0.02em',
            backdropFilter: 'blur(10px)',
        },
        className: 'animate-bounce'
    },
];
const initialEdges: any[] = [];

function FlowContent({ shouldFitView, centerInitial, nodes }: { shouldFitView: boolean; centerInitial: boolean; nodes: Node[] }) {
    const { fitView, getNodesBounds, setViewport } = useReactFlow();

    useEffect(() => {
        if (shouldFitView) {
            setTimeout(() => {
                // Exclude report node from fitView so it stays at the bottom
                const nodesWithoutReport = nodes.filter(n => n.id !== 'report');
                
                // Debug logging
                console.log('🔍 [DEBUG] fitView called:', {
                    totalNodes: nodes.length,
                    nodesWithoutReport: nodesWithoutReport.length,
                    reportNode: nodes.find(n => n.id === 'report'),
                    reportNodePosition: nodes.find(n => n.id === 'report')?.position,
                    nodesToFit: nodesWithoutReport.map(n => ({ id: n.id, y: n.position.y }))
                });
                
                // Calculate bounds for ALL nodes including report to ensure it's visible at bottom
                if (nodes.length > 0) {
                    try {
                        // Get bounds for all nodes (including report) to ensure full graph is visible
                        const allBounds = getNodesBounds(nodes);
                        const reportNode = nodes.find(n => n.id === 'report');
                        
                        console.log('🔍 [DEBUG] All nodes bounds:', allBounds);
                        console.log('🔍 [DEBUG] Report node position:', reportNode?.position);
                        
                        // Calculate viewport to show all nodes including report at bottom
                        const padding = 0.15; // Slightly less padding to show more
                        const viewportWidth = window.innerWidth;
                        const viewportHeight = window.innerHeight;
                        
                        // Calculate zoom to fit all nodes
                        const scaleX = viewportWidth / (allBounds.width * (1 + 2 * padding));
                        const scaleY = viewportHeight / (allBounds.height * (1 + 2 * padding));
                        const zoom = Math.min(scaleX, scaleY, 1.0); // Limit max zoom to ensure visibility
                        
                        // Center all bounds (including report) in the viewport
                        const centerX = allBounds.x + allBounds.width / 2;
                        const centerY = allBounds.y + allBounds.height / 2;
                        const x = viewportWidth / 2 - centerX * zoom;
                        const y = viewportHeight / 2 - centerY * zoom;
                        
                        console.log('🔍 [DEBUG] Setting viewport (all nodes including report):', { 
                            x, y, zoom, 
                            allBounds,
                            reportNodePosition: reportNode?.position,
                            viewportSize: { viewportWidth, viewportHeight }
                        });
                        setViewport({ x, y, zoom }, { duration: 400 });
                    } catch (error) {
                        console.warn('Failed to calculate bounds, using default fitView:', error);
                        // Fallback: use fitView which will include all nodes
                        fitView({ padding: 0.15, duration: 400, maxZoom: 1.0 });
                    }
                } else {
                    fitView({ padding: 0.2, duration: 400 });
                }
            }, 100);
        }
    }, [shouldFitView, fitView, getNodesBounds, setViewport, nodes]);

    useEffect(() => {
        if (centerInitial) {
            // Center the initial node on mount
            setTimeout(() => {
                fitView({ 
                    padding: 0.4, 
                    duration: 800,
                    maxZoom: 1.2,
                    minZoom: 0.8
                });
            }, 300);
        }
    }, [centerInitial, fitView]);

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
    
    // Debug: Monitor node position changes
    useEffect(() => {
        const reportNode = nodes.find(n => n.id === 'report');
        if (reportNode) {
            console.log('🔍 [DEBUG] Report node position in state:', {
                id: reportNode.id,
                position: reportNode.position,
                allNodes: nodes.map(n => ({ id: n.id, y: n.position.y }))
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
            console.log('🔍 [DEBUG] After transformDataToGraph:', {
              totalNodes: newNodes.length,
              reportNode: newNodes.find(n => n.id === 'report'),
              allNodePositions: newNodes.map(n => ({ id: n.id, type: n.data?.type, position: n.position })),
              maxY: Math.max(...newNodes.map(n => n.position.y)),
              minY: Math.min(...newNodes.map(n => n.position.y))
            });
            
            setNodes(newNodes);
            setEdges(newEdges);
            setResearchData(data); // Store research data for PDF export
            setShouldFitView(true);
            setCenterInitial(false); // Don't center after research

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
        <div className="te-bg" style={{ 
            width: '100vw', 
            height: '100vh', 
            background: '#0a0a0a',
            position: 'relative',
            overflow: 'hidden',
            padding: '32px 48px'
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
                    paddingTop: 180, 
                    height: '100%'
                }}
            >
                <FlowContent shouldFitView={shouldFitView} centerInitial={centerInitial} nodes={nodes} />
                <Controls 
                    style={{
                        background: 'rgba(18, 18, 18, 0.8)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '0px',
                        padding: '8px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    }}
                />
                <MiniMap 
                    style={{
                        background: 'rgba(18, 18, 18, 0.8)',
                        border: '2px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '0px',
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    }}
                    nodeColor={(node) => {
                        if (node.data?.type === 'root') return 'rgba(255, 255, 255, 0.2)';
                        if (node.data?.type === 'report') return 'rgba(76, 175, 80, 0.3)';
                        return 'rgba(255, 255, 255, 0.1)';
                    }}
                />
                <Background 
                    variant={BackgroundVariant.Dots} 
                    gap={40} 
                    size={1.5}
                    color="rgba(255, 255, 255, 0.03)"
                />

                <Panel position="top-center" className="w-full max-w-2xl mx-auto mt-8 z-10 animate-slide-in px-4">
                    <div className="flex flex-col items-center gap-5">
                        <div className="text-center space-y-2">
                            <h1 className="text-[44px] font-semibold text-white tracking-tight" style={{ letterSpacing: '-0.02em' }}>
                                RabbitHole
                            </h1>
                            <p className="text-white/40 text-base font-normal tracking-wide">
                                Discover knowledge through exploration
                            </p>
                        </div>
                        <Card className="te-card-dark p-4 flex gap-3 w-full items-center rounded-xl border border-white/10 shadow-lg">
                            <Input
                                placeholder="What would you like to explore?"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="bg-white/5 border border-white/15 text-white placeholder:text-white/40 flex-1 h-11 text-base rounded-lg px-4 focus:border-white/40 focus:ring-0 transition-all duration-200 font-medium"
                                onKeyDown={(e) => e.key === 'Enter' && !loading && handleResearch()}
                                disabled={loading}
                            />
                            <Button
                                onClick={handleResearch}
                                disabled={loading || !query.trim()}
                                className="bg-white/10 hover:bg-white/20 text-white min-w-[110px] h-11 rounded-lg font-medium text-sm border border-white/20 hover:border-white/35 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.5)] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 tracking-wide"
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <span className="w-4 h-4 border border-white/30 border-t-white rounded-full animate-spin" />
                                        <span>Exploring</span>
                                    </span>
                                ) : (
                                    'Explore'
                                )}
                            </Button>
                        </Card>
                    </div>
                </Panel>

                {selectedNode && (
                    <Panel position="top-right" className="w-full max-w-xl mt-16 mr-10 z-20 animate-slide-in px-4">
                        <Card 
                            ref={sidebarRef}
                            className="te-card-dark p-7 max-h-[80vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent"
                        >
                            <div className="flex justify-between items-start mb-6 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-sm pb-4 -mx-2 px-2 z-10 border-b-2 border-white/10" style={{ borderBottomWidth: '2px' }}>
                                <div className="flex-1 pr-4">
                                    <h3 className="text-2xl font-semibold text-white mb-2 tracking-tight" style={{ letterSpacing: '-0.01em' }}>
                                        {selectedNode.data.label}
                                    </h3>
                                    <p className="text-white/40 text-xs uppercase tracking-wider font-medium">
                                        {selectedNode.data.type || 'node'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {researchData && selectedNode.data.type === 'report' && (
                                        <Button
                                            onClick={handleDownloadPDF}
                                            size="sm"
                                            className="bg-white/10 hover:bg-white/15 text-white text-xs h-9 px-4 rounded-none font-semibold border-2 border-white/20 hover:border-white/30 shadow-[0_4px_16px_rgba(0,0,0,0.4)] hover:shadow-[0_6px_24px_rgba(0,0,0,0.6)] transition-all duration-200 transform hover:scale-105 backdrop-blur-sm"
                                            style={{ borderWidth: '2px' }}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            PDF
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setSelectedNode(null)}
                                        className="text-white/40 hover:text-white/70 hover:bg-white/5 h-9 w-9 p-0 flex-shrink-0 rounded-none border-2 border-white/10 hover:border-white/20 transition-all duration-200 text-xl font-semibold"
                                        style={{ borderWidth: '2px' }}
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
                                    className="text-sm text-white/60 hover:text-white/80 mb-5 block break-all underline decoration-white/20 hover:decoration-white/40 transition-all duration-300 font-medium"
                                >
                                    {selectedNode.data.url}
                                </a>
                            )}
                            
                            <div className="text-base text-white/80 space-y-2 leading-relaxed">
                                {selectedNode.data.details && (
                                    <div className="prose prose-invert max-w-none markdown-content">
                                        {typeof selectedNode.data.details === 'string' ? (
                                            <ReactMarkdown
                                                components={{
                                                    h1: ({node, ...props}) => <h1 className="text-white text-3xl font-semibold mb-6 mt-8 border-b-2 border-white/20 pb-3 tracking-tight" style={{ letterSpacing: '-0.02em', borderBottomWidth: '2px' }} {...props} />,
                                                    h2: ({node, ...props}) => <h2 className="text-white text-2xl font-semibold mb-5 mt-7 tracking-tight" style={{ letterSpacing: '-0.01em' }} {...props} />,
                                                    h3: ({node, ...props}) => <h3 className="text-white text-xl font-semibold mb-4 mt-6 tracking-tight" {...props} />,
                                                    p: ({node, ...props}) => <p className="text-white/70 leading-[1.8] mb-5 font-normal" style={{ letterSpacing: '0.01em' }} {...props} />,
                                                    ul: ({node, ...props}) => <ul className="list-disc list-outside text-white/70 mb-5 ml-6 space-y-2" {...props} />,
                                                    ol: ({node, ...props}) => <ol className="list-decimal list-outside text-white/70 mb-5 ml-6 space-y-2" {...props} />,
                                                    li: ({node, ...props}) => <li className="ml-2 text-white/70 leading-[1.8] font-normal" {...props} />,
                                                    code: ({node, inline, ...props}: any) => 
                                                        inline ? (
                                                            <code className="bg-white/10 text-white px-2 py-1 rounded-none text-sm font-mono border-2 border-white/20 font-medium" style={{ borderWidth: '2px' }} {...props} />
                                                        ) : (
                                                            <code className="block bg-white/5 text-white/90 p-4 rounded-none text-sm overflow-x-auto mb-5 font-mono border-2 border-white/10" style={{ borderWidth: '2px' }} {...props} />
                                                        ),
                                                    pre: ({node, ...props}) => <pre className="bg-white/5 text-white/90 p-4 rounded-none text-sm overflow-x-auto mb-5 font-mono border-2 border-white/10" style={{ borderWidth: '2px' }} {...props} />,
                                                    a: ({node, ...props}: any) => <a className="text-white/60 hover:text-white underline decoration-white/30 hover:decoration-white/50 font-medium transition-all duration-300" target="_blank" rel="noopener noreferrer" {...props} />,
                                                    blockquote: ({node, ...props}) => <blockquote className="border-l-3 border-white/20 pl-5 italic text-white/60 mb-5 my-5 font-normal" style={{ borderLeftWidth: '3px' }} {...props} />,
                                                    strong: ({node, ...props}) => <strong className="font-semibold text-white" {...props} />,
                                                    em: ({node, ...props}) => <em className="italic text-white/80 font-normal" {...props} />,
                                                    hr: ({node, ...props}) => <hr className="border-white/10 my-8" style={{ borderWidth: '2px' }} {...props} />,
                                                }}
                                            >
                                                {selectedNode.data.details}
                                            </ReactMarkdown>
                                        ) : (
                                            <pre className="text-sm overflow-auto bg-white/5 text-white/80 p-4 rounded-none border-2 border-white/10" style={{ borderWidth: '2px' }}>
                                                {JSON.stringify(selectedNode.data.details, null, 2)}
                                            </pre>
                                        )}
                                    </div>
                                )}
                            </div>
                        </Card>
                    </Panel>
                )}
            </ReactFlow>
            </ReactFlowProvider>
        </div>
    );
}