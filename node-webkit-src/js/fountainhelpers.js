;(function() {

  var inline = {
    bold_italic_underline: '<span class=\"bold italic underline\">$2</span>',
    bold_underline: '<span class=\"bold underline\">$2</span>',
    italic_underline: '<span class=\"italic underline\">$2</span>',
    bold_italic: '<span class=\"bold italic\">$2</span>',
    bold: '<span class=\"bold\">$2</span>',
    italic: '<span class=\"italic\">$2</span>',
    underline: '<span class=\"underline\">$2</span>'
  };

  var regex = {
    emphasis: /(_|\*{1,3}|_\*{1,3}|\*{1,3}_)(.+)(_|\*{1,3}|_\*{1,3}|\*{1,3}_)/g,
    bold_italic_underline: /(_{1}\*{3}(?=.+\*{3}_{1})|\*{3}_{1}(?=.+_{1}\*{3}))(.+?)(\*{3}_{1}|_{1}\*{3})/g,
    bold_underline: /(_{1}\*{2}(?=.+\*{2}_{1})|\*{2}_{1}(?=.+_{1}\*{2}))(.+?)(\*{2}_{1}|_{1}\*{2})/g,
    italic_underline: /(?:_{1}\*{1}(?=.+\*{1}_{1})|\*{1}_{1}(?=.+_{1}\*{1}))(.+?)(\*{1}_{1}|_{1}\*{1})/g,
    bold_italic: /(\*{3}(?=.+\*{3}))(.+?)(\*{3})/g,
    bold: /(\*{2}(?=.+\*{2}))(.+?)(\*{2})/g,
    italic: /(\*{1}(?=.+\*{1}))(.+?)(\*{1})/g,
    underline: /(_{1}(?=.+_{1}))(.+?)(_{1})/g,
  };

  var markupLineToHtml = function(markup) {
    var styles = ['underline', 'italic', 'bold', 'bold_italic', 'italic_underline', 'bold_underline', 'bold_italic_underline'];
    var i = styles.length, style, match;
    while (i--) {
      style = styles[i];
      match = regex[style];
      if (match.test(markup)) {
        markup = markup.replace(match, inline[style]);
      }
    }
    return markup.replace(/\[star\]/g, '*').replace(/\[underline\]/g, '_');
  };

  var markupToHtml = function(markup) {
    var html = [];
    var lines = markup.split("\n");
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      html.push(markupLineToHtml(line));
    }
    return html.join("<br>");
  };

  var htmlToMarkup = function(string) {
    for (var i=0; i<10; i++) {
      string = convert2markup(string);
    }
    return string;
  }

  var convert2markup = function(string) {
    var finalString = "";
    var j = $.parseHTML(string)
    if (!j) return '';
    for (var i=0; i<j.length; i++) {
      switch ($(j[i]).attr('class')) {
        case 'underline':
          finalString = finalString + "_" + $(j[i]).html() + "_";
          break;
        case 'italic':
          finalString = finalString + "*" + $(j[i]).html() + "*";
          break;
        case 'bold':
          finalString = finalString + "**" + $(j[i]).html() + "**";
          break;
        default:
          finalString = finalString + $(j[i]).text();
      }  
    }
    return finalString;
  }

  window.fountainHelpers = {
    markupToHtml: markupToHtml,
    htmlToMarkup: htmlToMarkup
  };

}).call(this);
