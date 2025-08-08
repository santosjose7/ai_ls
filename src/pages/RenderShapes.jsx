import React from 'react';
import { Stage, Layer } from 'react-konva';
import * as Konva from 'react-konva';

// Map string names to Konva components dynamically
const konvaComponents = {
  Circle: Konva.Circle,
  Rect: Konva.Rect,
  Line: Konva.Line,
  Text: Konva.Text,
  Star: Konva.Star,
  RegularPolygon: Konva.RegularPolygon,
  Ellipse: Konva.Ellipse,
  Image: Konva.Image,
  Label: Konva.Label,
  Tag: Konva.Tag,
  // Add more as needed
};

const RenderShapes = ({ content }) => {
  const { title, explanation, width = 600, height = 400, shapes = [] } = content;

  return (
    <div className="visual-diagram">
      <h4>{title}</h4>
      <div className="diagram-container">
        <Stage width={width} height={height}>
          <Layer>
            {shapes.map((shape, index) => {
              const ShapeComponent = konvaComponents[shape.shapeType];
              if (!ShapeComponent) return null;
              return <ShapeComponent key={index} {...shape.props} />;
            })}
          </Layer>
        </Stage>
      </div>
      {explanation && <p className="diagram-explanation">{explanation}</p>}
    </div>
  );
};

export default RenderShapes;
