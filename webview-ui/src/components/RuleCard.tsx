import React from 'react';
import ReactMarkdown from 'react-markdown';

interface RuleAuthor {
  name: string;
  url: string | null;
  avatar: string | null;
}

interface Rule {
  title: string;
  tags: string[];
  slug: string;
  libs: string[];
  content: string;
  author: RuleAuthor;
}

interface RuleCardProps {
  rule: Rule;
  onSelect: (rule: Rule) => void;
}

const RuleCard: React.FC<RuleCardProps> = ({ rule, onSelect }) => {
  const handleClick = () => {
    onSelect(rule);
  };

  const removeIndentation = (content: string) => {
    return content.split('\n').map(line => line.trimStart()).join('\n');
  };

  return (
    <div className="rule-card">
      <div className="rule-header">
        <h3 className="rule-title">
          {rule.title}
        </h3>
        <div className="tags">
          {rule.tags.map((tag, index) => (
            <span key={index} className="tag">{tag}</span>
          ))}
        </div>
      </div>
      <div className="rule-preview">
        <ReactMarkdown>{removeIndentation(rule.content)}</ReactMarkdown>
      </div>
      <div className="rule-footer" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto'
      }}>
        <div className="author">
          {rule.author.name}
        </div>
        <button className="use-rule-button" onClick={handleClick}>
          Use Rule
        </button>
      </div>
    </div>
  );
};

export default RuleCard; 