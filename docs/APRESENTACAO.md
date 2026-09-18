# Checklist da apresentação

## Antes

- [ ] Instalar Node e JDK conforme README, testar downloads antes do dia.
- [ ] Rodar testes e corrigir qualquer falha.
- [ ] Iniciar API e frontend; conferir catálogo carregado.
- [ ] Definir a senha inicial do administrador sem projetá-la para a sala.
- [ ] Usar usuários, endereços e senhas fictícios.
- [ ] Fazer backup do SQL Server pelo SSMS e guardar a pasta de uploads; aplicar 03 e 04 com a API parada.

## Roteiro de 5 a 10 minutos

1. Problema: organizar o processo de catálogo, compra e gestão de estoque de uma loja de hardware.
2. Tecnologias: React para interface, Spring Boot para regras, JPA para persistência.
3. Cliente: pesquisa, filtro, detalhes, cadastro e carrinho.
4. Compra: login obrigatório, escolha do endereço salvo e modalidade; a API estima frete por região, quantidade e valor, calcula tudo e gera o pedido.
5. Administrador: cadastrar cliente, produto com imagem, estoque, pedidos e indicadores.
6. Mobile: abrir /mobile; entrar na mesma conta, consultar favoritos, endereços e pedidos.
7. Segurança: usuário comum não altera produtos; cliente não acessa pedidos alheios.
8. Integridade: compra reduz estoque; cancelamento repõe; duplo clique não duplica.
9. Conclusão: fluxo acadêmico integrado; explicar honestamente integrações comerciais futuras.

## Casos de teste manual

- [ ] Senha errada e e-mail repetido produzem mensagens adequadas.
- [ ] Produto inativo não aparece na loja; sem estoque não pode ser comprado.
- [ ] Atualizar um produto reflete no catálogo ao voltar.
- [ ] Carrinho permanece após recarregar a página; adicionar dois produtos e alterar quantidades.
- [ ] Login solicitado no checkout retoma a compra sem perder itens.
- [ ] Cadastrar Casa e Trabalho, trocar o principal e selecionar na compra.
- [ ] Editar/excluir um endereço salvo não altera a entrega de pedidos anteriores.
- [ ] Endereço pode ser digitado quando ViaCEP está indisponível.
- [ ] Cotação muda entre SP e outra região, e entre normal e expresso.
- [ ] Compra normal de R$ 3.500 ou mais mostra frete grátis.
- [ ] API fora do ar não limpa o carrinho nem mostra compra concluída.
- [ ] Pedido aparece para seu dono, não para outro cliente.
- [ ] Cancelar duas vezes não duplica a reposição.
- [ ] Administrador não pode pular de RECEBIDO para ENTREGUE.
- [ ] Produto com histórico não é excluído; pode ser desativado.
- [ ] Conferir telas em computador, celular e zoom de 200%.
- [ ] Reiniciar API mantém usuários, produtos e pedidos.

Esses itens são um roteiro a executar; caixas vazias não representam testes já realizados.
