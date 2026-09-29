// Caixa SMTP descartável do CI: escuta somente loopback e nunca entrega e-mail externo.
const net=require('node:net'),fs=require('node:fs');
if(process.env.BBS_E2E!=='true')throw new Error('Somente CI descartável');
fs.mkdirSync('test-results',{recursive:true});
const messages=[];fs.writeFileSync('test-results/private-mails.json','[]');
net.createServer(socket=>{
  let buffer='',data=false,lines=[];
  socket.setTimeout(15000,()=>socket.destroy());socket.on('error',()=>{});
  socket.write('220 localhost BBS test SMTP\r\n');
  socket.on('data',chunk=>{
    buffer+=chunk.toString();
    while(buffer.includes('\r\n')) {
      const end=buffer.indexOf('\r\n'),line=buffer.slice(0,end);buffer=buffer.slice(end+2);
      if(data){if(line==='.') {messages.push(lines.join('\r\n'));fs.writeFileSync('test-results/private-mails.json',JSON.stringify(messages));lines=[];data=false;socket.write('250 stored\r\n');}else lines.push(line.replace(/^\.\./,'.'));continue;}
      if(/^EHLO|^HELO/i.test(line))socket.write('250 localhost\r\n');
      else if(/^DATA/i.test(line)){data=true;socket.write('354 end with dot\r\n');}
      else if(/^QUIT/i.test(line)){socket.end('221 bye\r\n');}
      else socket.write('250 OK\r\n');
    }
  });
}).listen(1025,'127.0.0.1');
