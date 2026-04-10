const renderBasicMarkdown = (text) => {
  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
    
  // Closed tags
  html = html.replace(/\*\*((?:(?!\n\n)[\s\S])+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*((?:(?!\n\n)[\s\S])+?)\*/g, '<em>$1</em>');
  html = html.replace(/(?<=^|\W)_((?:(?!\n\n)[\s\S])+?)_(?=$|\W)/g, '<em>$1</em>');

  // Unclosed tags at the end of the string.
  html = html.replace(/\*\*([^<]*)$/, '<strong>$1</strong>');
  html = html.replace(/\*([^<]*)$/, '<em>$1</em>');
  html = html.replace(/(?<=^|\W)_([^<]*)$/, '<em>$1</em>');

  return html;
};

console.log(renderBasicMarkdown("I am **bold**"));
console.log(renderBasicMarkdown("I am **streaming bold"));
console.log(renderBasicMarkdown("I am *italic* and **streaming bold"));
console.log(renderBasicMarkdown("I am **streaming bold \nwith newline"));
console.log(renderBasicMarkdown("Look at _this_!"));
console.log(renderBasicMarkdown("Look at _streaming italic"));
console.log(renderBasicMarkdown("Nested **bold and *italic* inside**"));
console.log(renderBasicMarkdown("Here is ** empty bold **"));
