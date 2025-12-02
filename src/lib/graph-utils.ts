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

  // Define Layout Levels (Vertical Spacing) - Compact, beautiful layout
  const LEVEL_1_Y = 0;    // Root Query (Top)
  const LEVEL_2_Y = 300;  // Sources (Middle) - Compact spacing
  const LEVEL_3_Y = 600;  // Final Report (Bottom) - Close to sources for shorter edges

  // 1. Create Root Node - Clean, minimal design
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
      background: 'rgba(255, 255, 255, 0.08)',
      color: '#ffffff', 
      border: '1px solid rgba(255, 255, 255, 0.15)',
      width: 280,
      fontWeight: '500',
      fontSize: '17px',
      borderRadius: '16px',
      padding: '28px 32px',
      boxShadow: '0 4px 24px rgba(0, 0, 0, 0.3)',
      letterSpacing: '-0.01em',
    },
    className: 'cursor-pointer',
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
    // Increase spacing to prevent overlapping - 280px between nodes
    const spacing = 280;
    const xPos = (index - (sources.length - 1) / 2) * spacing; // Spread horizontally, centered
    
    // Use title from source, fallback to hostname
    const sourceTitle = source.title || (source.url ? getHostname(source.url) : `Source ${index + 1}`);
    const sourceContent = getSourceContent(source);
    
    // Clean, minimal source nodes - subtle gray variations
    nodes.push({
      id: sourceId,
      position: { x: xPos, y: LEVEL_2_Y },
      data: { 
        label: sourceTitle, 
        type: 'source',
        details: sourceContent || source.url || 'No content available',
        url: source.url,
        category: source.category,
        position: source.position,
      },
      type: 'default',
      style: { 
        background: 'rgba(255, 255, 255, 0.06)',
        color: '#ffffff', 
        border: '1px solid rgba(255, 255, 255, 0.12)',
        width: 260,
        fontSize: '15px',
        borderRadius: '14px',
        padding: '20px 24px',
        boxShadow: '0 2px 16px rgba(0, 0, 0, 0.2)',
        fontWeight: '400',
        letterSpacing: '-0.01em',
      },
      className: 'cursor-pointer hover:bg-white/10 transition-colors duration-200',
    });

    edges.push({
      id: `e-${rootId}-${sourceId}`,
      source: rootId,
      target: sourceId,
      animated: true,
        style: { 
        stroke: 'rgba(255, 255, 255, 0.2)', 
        strokeWidth: 1.5,
        strokeDasharray: '6 4',
      },
    });
  });

  // 3. Process Final Analysis/Report if available
  // For v2/search, we can create a synthesized report node
  // Report should appear at the bottom, where all source node edges converge
  if (sources.length > 0) {
    // Generate unique ID using timestamp to prevent React Flow state preservation
    // This forces React Flow to treat the report node as new on each search
    const timestamp = Date.now();
    const reportId = `report-${timestamp}`;
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
        background: 'rgba(0, 122, 255, 0.12)',
        color: '#ffffff', 
        border: '1px solid rgba(0, 122, 255, 0.3)',
        width: 300,
        borderRadius: '16px',
        padding: '24px 28px',
        fontWeight: '500',
        fontSize: '17px',
        boxShadow: '0 4px 24px rgba(0, 122, 255, 0.15)',
        letterSpacing: '-0.01em',
      },
      className: 'cursor-pointer',
      draggable: true,
    };
    
    // Debug logging
    console.log('🔍 [DEBUG] Report Node Position:', {
      reportId,
      timestamp,
      position: reportNode.position,
      levels: { LEVEL_1_Y, LEVEL_2_Y, LEVEL_3_Y },
      totalNodes: nodes.length,
      maxYBeforeReport: Math.max(...nodes.map(n => n.position.y)),
      nodeIds: nodes.map(n => ({ id: n.id, y: n.position.y })),
      message: `Report node created with unique ID ${reportId} at Y=${LEVEL_3_Y} to prevent state caching`
    });
    
    nodes.push(reportNode);

    // Connect all sources to the report (Synthesis)
    // Use dynamic reportId in edge ID to prevent edge caching issues
    sources.forEach((_: any, index: number) => {
      edges.push({
        id: `e-source-${index}-${reportId}`,
        source: `source-${index}`,
        target: reportId,
        animated: true,
        style: { 
          stroke: 'rgba(0, 122, 255, 0.3)', 
          opacity: 0.4, 
          strokeWidth: 1.5,
          strokeDasharray: '6 4',
        },
      });
    });
  }

  return { nodes, edges };
};