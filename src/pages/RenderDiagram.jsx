import React, { useRef, useEffect } from 'react';
import mermaid from 'mermaid';

const RenderDiagram = ({ content }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    if (content.mermaidCode && containerRef.current) {
      try {
        containerRef.current.innerHTML = '';
        const id = `mermaid-${content.id}`;

        mermaid.render(id, content.mermaidCode, (svgCode) => {
          containerRef.current.innerHTML = svgCode;
        });
      } catch (e) {
        containerRef.current.innerHTML = `<div style="color:red;">Error rendering Mermaid diagram: ${e.message}</div>`;
        console.error('❌ Mermaid render error:', e);
      }
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
