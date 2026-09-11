# Checklist da apresentação

## Antes

- [ ] Instalar Node e JDK conforme README, testar downloads antes do dia.
- [ ] Rodar testes e corrigir qualquer falha.
- [ ] Iniciar API e frontend; conferir catálogo carregado.
- [ ] Definir a senha inicial do administrador sem projetá-la para a sala.
- [ ] Usar usuários, endereços e senhas fictícios.
- [ ] Confirmar que o banco em arquivo foi salvo e fazer backup com a API parada.

## Roteiro de 5 a 10 minutos

1. Problema: organizar o processo de catálogo, compra e gestão de estoque de uma loja de hardware.
2. Tecnologias: React para interface, Spring Boot para regras, JPA para persistência.
3. Cliente: pesquisa, filtro, detalhes, cadastro e carrinho.
4. Compra: endereço e modalidade simulada; a API calcula tudo e gera o pedido.
5. Administrador: produto com imagem, estoque, pedidos, indicadores e lista de clientes.
6. Segurança: usuário comum não altera produtos; cliente não acessa pedidos alheios.
7. Integridade: compra reduz estoque; cancelamento repõe; duplo clique não duplica.
8. Conclusão: fluxo acadêmico integrado; explicar honestamente integrações comerciais futuras.

## Casos de teste manual

- [ ] Senha errada e e-mail repetido produzem mensagens adequadas.
- [ ] Produto inativo não aparece na loja; sem estoque não pode ser comprado.
- [ ] Atualizar um produto reflete no catálogo ao voltar.
- [ ] Carrinho permanece após recarregar a página.
- [ ] Endereço pode ser digitado quando ViaCEP está indisponível.
- [ ] API fora do ar não limpa o carrinho nem mostra compra concluída.
- [ ] Pedido aparece para seu dono, não para outro cliente.
- [ ] Cancelar duas vezes não duplica a reposição.
- [ ] Administrador não pode pular de RECEBIDO para ENTREGUE.
- [ ] Produto com histórico não é excluído; pode ser desativado.
- [ ] Conferir telas em computador, celular e zoom de 200%.
- [ ] Reiniciar API mantém usuários, produtos e pedidos.

Esses itens são um roteiro a executar; caixas vazias não representam testes já realizados.
