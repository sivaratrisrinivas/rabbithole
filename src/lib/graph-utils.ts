import { type Node, type Edge } from '@xyflow/react';

// Helper function to clean markdown content - remove unnecessary elements
function cleanMarkdownContent(content: string): string {
  let cleaned = content;
  
  // Remove image markdown syntax: ![alt](url) or ![alt](url)](link)
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)\]?\([^\)]*\)?/g, '');
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '');
  
  // Remove navigation links and common UI elements
  const navKeywords = [
    'Hide', 'Jump to content', 'Log in', 'Log In', 'Sign in', 'Sign In', 'Sign up', 'Sign Up',
    'Back', 'Skip navigation', 'Skip to content', 'Search', 'More +', 'Participate in',
    'Open in app', 'Write', 'Sitemap', 'Ask the Chatbot', 'Games & Quizzes', 'History & Society',
    'Science & Tech', 'Biographies', 'Animals & Nature', 'Geography & Travel', 'Arts & Culture',
    'ProCon', 'Money', 'Videos', 'Introduction', 'Etymology', 'Skip to search', 'Go to',
    'Try again', 'Wait a moment', 'Try searching', 'browse some of our favourites'
  ];
  navKeywords.forEach(keyword => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(`\\[${escaped}[^\\]]*\\]\\([^\\)]+\\)`, 'gi'), '');
  });
  
  // Remove error messages (403, 404, etc.)
  cleaned = cleaned.replace(/Error \d+ \(.*?\)!!?\d*/gi, '');
  cleaned = cleaned.replace(/\*\*\d+\.\*\* That's an error\./gi, '');
  cleaned = cleaned.replace(/We're sorry, but you do not have access to this page\. That's all we know\./gi, '');
  cleaned = cleaned.replace(/The page you were looking for appears to have moved or never existed\./gi, '');
  cleaned = cleaned.replace(/Something went wrong\. Wait a moment and try again\./gi, '');
  cleaned = cleaned.replace(/404/gi, '');
  cleaned = cleaned.replace(/reCAPTCHA.*?verification/gi, '');
  cleaned = cleaned.replace(/protected by.*?reCAPTCHA/gi, '');
  cleaned = cleaned.replace(/Privacy.*?Terms/gi, '');
  
  // Remove ads and promotional content
  cleaned = cleaned.replace(/Advertisement.*?Remove Ads/gi, '');
  cleaned = cleaned.replace(/Want to remove ads\?.*?Premium Member.*?remove all ads/gi, '');
  cleaned = cleaned.replace(/Remove Ads/gi, '');
  
  // Remove "From Wikipedia, the free encyclopedia" and similar boilerplate
  cleaned = cleaned.replace(/From Wikipedia, the free encyclopedia/gi, '');
  cleaned = cleaned.replace(/Type of cooperative argumentative dialogue/gi, '');
  
  // Remove common navigation/menu items and headers
  cleaned = cleaned.replace(/\*?\s*(Articles|Client Education|Professional Guides|Topics|More \+)/gi, '');
  cleaned = cleaned.replace(/\[.*?Logo.*?\]\([^\)]+\)/gi, '');
  
  // Remove YouTube embeds and video links
  cleaned = cleaned.replace(/\[.*?YouTube.*?\]\([^\)]+\)/gi, '');
  cleaned = cleaned.replace(/Watch here!.*?YouTube/gi, '');
  cleaned = cleaned.replace(/Prefer a video version.*?Watch here!/gi, '');
  cleaned = cleaned.replace(/If playback doesn't begin shortly.*?restarting your device/gi, '');
  cleaned = cleaned.replace(/You're signed out.*?Videos/gi, '');
  cleaned = cleaned.replace(/Tap to unmute/gi, '');
  cleaned = cleaned.replace(/Watch later|Share|Copy link|Info|Shopping/gi, '');
  cleaned = cleaned.replace(/More videos/gi, '');
  
  // Remove markdown headers that are just navigation
  cleaned = cleaned.replace(/^#+\s+(Search|Sign|Log|Menu|Navigation|Skip|Jump).*$/gim, '');
  
  // Remove markdown links but keep the text: [text](url) -> text
  cleaned = cleaned.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
  
  // Remove standalone URLs in markdown format
  cleaned = cleaned.replace(/\[(https?:\/\/[^\]]+)\]\(https?:\/\/[^\)]+\)/g, '');
  
  // Remove markdown formatting but keep text
  cleaned = cleaned.replace(/\*\*([^\*]+)\*\*/g, '$1');
  cleaned = cleaned.replace(/\*([^\*]+)\*/g, '$1');
  cleaned = cleaned.replace(/__([^_]+)__/g, '$1');
  cleaned = cleaned.replace(/_([^_]+)_/g, '$1');
  
  // Remove horizontal rules used as separators
  cleaned = cleaned.replace(/^[\*\-_]{3,}$/gm, '');
  
  // Remove lines that are just URLs
  cleaned = cleaned.replace(/^https?:\/\/[^\s]+$/gm, '');
  
  // Remove lines with only special characters or very short lines
  cleaned = cleaned.split('\n')
    .filter(line => {
      const trimmed = line.trim();
      return trimmed.length > 5 && 
             !/^[\*\-_=\s]+$/.test(trimmed) &&
             !trimmed.match(/^[^\w\s]+$/);
    })
    .join('\n');
  
  // Clean up multiple newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  // Remove leading/trailing whitespace from lines
  cleaned = cleaned.split('\n').map(line => line.trim()).join('\n');
  
  return cleaned.trim();
}

export const transformDataToGraph = (query: string, data: any) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Define Layout Levels (Vertical Spacing) - Strict Top-Middle-Bottom structure
  const LEVEL_1_Y = 0;    // Root Query (Top)
  const LEVEL_2_Y = 600;  // Sources (Middle) - Increased spacing for clarity
  const LEVEL_3_Y = 1200; // Final Report (Bottom) - Increased spacing for clarity

  // 1. Create Root Node (The User's Query) - Dark Teenage Engineering style
  const rootId = 'root';
  nodes.push({
    id: rootId,
    position: { x: 0, y: LEVEL_1_Y },
    data: { 
      label: query, 
      type: 'root', 
      details: `Research query: ${query}` 
    },
    type: 'default',
    style: { 
      background: 'rgba(255, 255, 255, 0.05)',
      color: '#ffffff', 
      border: '2px solid rgba(255, 255, 255, 0.2)',
      width: 240,
      fontWeight: '600',
      fontSize: '16px',
      borderRadius: '12px',
      padding: '24px 28px',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
      letterSpacing: '0.02em',
      backdropFilter: 'blur(10px)',
    },
    className: 'font-semibold animate-pop',
  });

  // 2. Process Sources (The websites found from Firecrawl v2/search)
  // API structure: { success: true, data: { web: [{ url, title, description, position, markdown?, metadata? }] } }
  const sources = data.data?.web || [];
  
  // Helper to extract hostname safely
  const getHostname = (url: string): string => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  };

  // Helper to extract relevant content from source
  const getSourceContent = (source: any): string => {
    // Priority: markdown (scraped) > description (search result) > metadata description
    if (source.markdown) {
      // Clean the markdown content
      const cleaned = cleanMarkdownContent(source.markdown);
      // Extract first meaningful paragraphs (skip navigation/boilerplate)
      const lines = cleaned.split('\n').filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 20 && 
               !trimmed.toLowerCase().includes('skip') &&
               !trimmed.toLowerCase().includes('jump') &&
               !trimmed.toLowerCase().includes('navigation') &&
               !trimmed.toLowerCase().includes('hide') &&
               !trimmed.toLowerCase().includes('log in') &&
               !trimmed.toLowerCase().includes('sign');
      });
      const content = lines.slice(0, 6).join('\n');
      return content.length > 1000 ? content.substring(0, 1000) + '...' : content;
    }
    
    // Use description from search results
    if (source.description) {
      return source.description;
    }
    
    // Fallback to metadata description
    if (source.metadata?.description) {
      return source.metadata.description;
    }
    
    return '';
  };
  
  sources.forEach((source: any, index: number) => {
    const sourceId = `source-${index}`;
    const xPos = (index - (sources.length - 1) / 2) * 240; // Spread horizontally, centered
    
    // Use title from source, fallback to hostname
    const sourceTitle = source.title || (source.url ? getHostname(source.url) : `Source ${index + 1}`);
    const sourceContent = getSourceContent(source);
    
    // Dark theme colors for sources - subtle variations
    const darkColors = [
      'rgba(255, 255, 255, 0.08)',
      'rgba(244, 67, 54, 0.15)',
      'rgba(33, 150, 243, 0.15)',
      'rgba(76, 175, 80, 0.15)',
      'rgba(255, 152, 0, 0.15)',
      'rgba(156, 39, 176, 0.15)',
    ];
    const sourceBg = darkColors[index % darkColors.length];
    
    nodes.push({
      id: sourceId,
      position: { x: xPos, y: LEVEL_2_Y }, // Middle level - Sources
      data: { 
        label: sourceTitle, 
        type: 'source',
        details: sourceContent || source.url || 'No content available',
        url: source.url,
        category: source.category, // Store category if available
        position: source.position, // Store ranking position
      },
      type: 'default',
      style: { 
        background: sourceBg,
        color: '#ffffff', 
        border: '2px solid rgba(255, 255, 255, 0.15)',
        width: 200,
        fontSize: '14px',
        borderRadius: '12px',
        padding: '18px 22px',
        boxShadow: '0 6px 24px rgba(0, 0, 0, 0.4)',
        fontWeight: '500',
        letterSpacing: '0.01em',
        transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
        backdropFilter: 'blur(10px)',
      },
      className: 'hover:scale-105 hover:border-white/30 hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] transition-all duration-200 cursor-pointer',
    });

    edges.push({
      id: `e-${rootId}-${sourceId}`,
      source: rootId,
      target: sourceId,
      animated: true,
      style: { 
        stroke: 'rgba(255, 255, 255, 0.3)', 
        strokeWidth: 2,
        strokeDasharray: '8 4',
      },
    });
  });

  // 3. Process Final Analysis/Report if available
  // For v2/search, we can create a synthesized report node
  // Report should appear at the bottom, where all source node edges converge
  if (sources.length > 0) {
    const reportId = 'report';
    // Position report at the bottom using strict level structure
    // This ensures it always appears below sources regardless of source count
    
    // Create a well-formatted markdown report from all sources
    let reportContent = `# Research Report\n\n`;
    reportContent += `## Summary\n\n`;
    reportContent += `This report synthesizes information from ${sources.length} source${sources.length > 1 ? 's' : ''}.\n\n`;
    reportContent += `---\n\n`;
    
    // Add each source with proper formatting
    sources.forEach((s: any, i: number) => {
      let sourceTitle = s.title || `Source ${i + 1}`;
      if (s.url) {
        try {
          sourceTitle = s.title || new URL(s.url).hostname || `Source ${i + 1}`;
        } catch {
          sourceTitle = s.title || `Source ${i + 1}`;
        }
      }
      
      reportContent += `## ${i + 1}. ${sourceTitle}\n\n`;
      
      // Use the same content extraction logic as nodes
      const content = getSourceContent(s);
      if (content && content.trim().length > 0) {
        // Further clean for report - remove excessive markdown formatting
        let reportContentText = content;
        
        // Convert markdown links to plain text
        reportContentText = reportContentText.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        
        // Remove excessive markdown formatting
        reportContentText = reportContentText.replace(/\*\*([^\*]+)\*\*/g, '$1');
        reportContentText = reportContentText.replace(/\*([^\*]+)\*/g, '$1');
        
        // Limit length for report
        const preview = reportContentText.length > 500 
          ? reportContentText.substring(0, 500) + '...' 
          : reportContentText;
        
        reportContent += `${preview}\n\n`;
      }
      
      // Add source URL if available
      if (s.url) {
        reportContent += `*Source: ${s.url}*\n\n`;
      }
      
      reportContent += `---\n\n`;
    });
    
    reportContent += `## Key Findings\n\n`;
    reportContent += `- Information gathered from ${sources.length} authoritative source${sources.length > 1 ? 's' : ''}\n`;
    reportContent += `- All sources have been analyzed and synthesized\n`;
    reportContent += `- Click on individual source nodes for detailed information\n\n`;
    
    // Add report node at the bottom - ensure it's the last node added
    // Use LEVEL_3_Y to enforce bottom position
    const reportNode = {
      id: reportId,
      position: { x: 0, y: LEVEL_3_Y },
      data: { 
        label: 'Final Report', 
        type: 'report', 
        details: reportContent
      },
      type: 'default',
      style: { 
        background: 'rgba(76, 175, 80, 0.2)',
        color: '#ffffff', 
        border: '2px solid rgba(76, 175, 80, 0.4)',
        width: 200,
        borderRadius: '12px',
        padding: '20px 26px',
        fontWeight: '600',
        fontSize: '16px',
        boxShadow: '0 8px 32px rgba(76, 175, 80, 0.3)',
        letterSpacing: '0.02em',
        backdropFilter: 'blur(10px)',
      },
      className: 'animate-bounce',
      draggable: true, // Allow dragging but position is set explicitly
    };
    
    // Debug logging
    console.log('🔍 [DEBUG] Report Node Position:', {
      reportId,
      position: reportNode.position,
      levels: { LEVEL_1_Y, LEVEL_2_Y, LEVEL_3_Y },
      totalNodes: nodes.length,
      maxYBeforeReport: Math.max(...nodes.map(n => n.position.y)),
      nodeIds: nodes.map(n => ({ id: n.id, y: n.position.y }))
    });
    
    nodes.push(reportNode);

    // Connect all sources to the report (Synthesis)
    sources.forEach((_: any, index: number) => {
      edges.push({
        id: `e-source-${index}-report`,
        source: `source-${index}`,
        target: reportId,
        animated: true,
        style: { 
          stroke: 'rgba(76, 175, 80, 0.4)', 
          opacity: 0.5, 
          strokeWidth: 2,
          strokeDasharray: '8 4',
        },
      });
    });
  }

  return { nodes, edges };
};