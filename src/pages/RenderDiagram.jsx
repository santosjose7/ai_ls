import React, { useRef, useEffect } from 'react';
import mermaid from 'mermaid';

const RenderDiagram = ({ content }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!content?.mermaidCode || !containerRef.current) return;

    // Initialize Mermaid once
    mermaid.initialize({ startOnLoad: false });

    try {
      // Clear any previous content
      containerRef.current.innerHTML = '';

      // Create a temporary div for rendering
      const tempId = `mermaid-${content.id}`;
      const tempDiv = document.createElement('div');
      tempDiv.id = tempId;
      tempDiv.className = 'mermaid';
      tempDiv.textContent = content.mermaidCode;
      containerRef.current.appendChild(tempDiv);

      // Trigger Mermaid to render
      mermaid.init(undefined, `#${tempId}`);
    } catch (e) {
      containerRef.current.innerHTML = `<div style="color:red;">Error rendering Mermaid diagram: ${e.message}</div>`;
      console.error('❌ Mermaid render error:', e);
    }
  }, [content]);

  return (
    <div className="visual-diagram">
      <h4>{content.title}</h4>
      <div className="diagram-container">
        <div className="diagram-render" ref={containerRef} />
        {content.description && <p>{content.description}</p>}
      </div>
      {content.explanation && (
        <p className="diagram-explanation">{content.explanation}</p>
      )}
    </div>
  );
};

export default RenderDiagram;
