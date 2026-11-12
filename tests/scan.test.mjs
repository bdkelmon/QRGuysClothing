import test from 'node:test';
import assert from 'node:assert/strict';
import {safePublicUrl, renderContent} from '../js/scan-content.mjs';
test('shared links reject script, insecure, credentialed and relative URLs', () => {
  for (const url of ['javascript:alert(1)','data:text/html,test','http://example.com','https://user:password@example.com','/private']) assert.equal(safePublicUrl(url),null);
  assert.equal(safePublicUrl('https://example.com/view'),'https://example.com/view');
});
test('text remains literal and unknown record fields are never rendered', () => {
  const nodes=[];
  const document={createElement:tag=>({tag})};
  const container={replaceChildren:()=>{nodes.length=0;},append:node=>nodes.push(node)};
  renderContent(document,container,{contentType:'text',text:'<script>alert(1)</script>',activation_code:'private'});
  assert.equal(nodes[0].textContent,'<script>alert(1)</script>');
  assert.equal(nodes[0].innerHTML,undefined);
  assert.equal(JSON.stringify(nodes).includes('private'),false);
});
