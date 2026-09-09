import type { MotifName } from '../components/atoms/Motif';

export type DoorSize = '1x1' | '1x2' | '2x1' | '2x2';

export interface CalendarDay {
  day: number;
  title: string;
  message: string;
  code?: string;
  motif: MotifName;
  size: DoorSize;
  gridArea: string;
  gridAreaMobile: string;
}

// The 25 doors tessellate their grid with no gaps: desktop 7x8, mobile 4x14
// (both 56 cells = the sum of the door footprints). See calendar.test.ts.
export const CALENDAR: CalendarDay[] = [
  { day: 1, title: 'Bem-vindo ao Advento', message: 'Vinte e cinco dias, vinte e cinco pequenas surpresas. Volta amanhã para abrir a porta seguinte.', motif: 'wreath', size: '2x2', gridArea: '1 / 1 / span 2 / span 2', gridAreaMobile: '1 / 1 / span 2 / span 2' },
  { day: 2, title: 'Uma citação para hoje', message: '"O maior presente que podes dar a alguém é o teu tempo." Oferece um bocadinho do teu hoje.', motif: 'star', size: '1x1', gridArea: '5 / 5 / span 1 / span 1', gridAreaMobile: '13 / 3 / span 1 / span 1' },
  { day: 3, title: 'Playlist de Inverno', code: 'ADVENTO-03', message: 'Usa o código como nome de uma playlist partilhada e adiciona a primeira música.', motif: 'candycane', size: '1x2', gridArea: '1 / 4 / span 2 / span 1', gridAreaMobile: '5 / 2 / span 2 / span 1' },
  { day: 4, title: 'Gesto simples', message: 'Manda mensagem a alguém com quem não falas há algum tempo.', motif: 'gift', size: '2x2', gridArea: '3 / 6 / span 2 / span 2', gridAreaMobile: '7 / 1 / span 2 / span 2' },
  { day: 5, title: 'Receita rápida', code: 'COZINHA-05', message: 'Chocolate quente: leite, cacau, um quadrado de chocolate negro e uma pitada de canela.', motif: 'candle', size: '2x1', gridArea: '3 / 3 / span 1 / span 2', gridAreaMobile: '5 / 3 / span 1 / span 2' },
  { day: 6, title: 'Pausa de dez minutos', message: 'Fecha os olhos e respira fundo dez vezes. É a tua porta de hoje.', motif: 'snowflake', size: '2x1', gridArea: '5 / 1 / span 1 / span 2', gridAreaMobile: '6 / 3 / span 1 / span 2' },
  { day: 7, title: 'Desafio de gratidão', message: 'Escreve três coisas boas que te aconteceram esta semana.', motif: 'bauble', size: '1x1', gridArea: '6 / 5 / span 1 / span 1', gridAreaMobile: '13 / 4 / span 1 / span 1' },
  { day: 8, title: 'Código secreto', code: 'ADVENTO-08', message: 'Copia o código e guarda-o. No dia 25 vais precisar dele.', motif: 'gift', size: '1x1', gridArea: '8 / 4 / span 1 / span 1', gridAreaMobile: '14 / 3 / span 1 / span 1' },
  { day: 9, title: 'Luz das velas', message: 'Acende uma vela ao jantar hoje. Muda tudo.', motif: 'candle', size: '1x2', gridArea: '1 / 3 / span 2 / span 1', gridAreaMobile: '5 / 1 / span 2 / span 1' },
  { day: 10, title: 'Maratona de leitura', code: 'LEITURA-10', message: 'Escolhe um livro curto e lê-o até ao fim do mês.', motif: 'candle', size: '2x1', gridArea: '5 / 6 / span 1 / span 2', gridAreaMobile: '9 / 3 / span 1 / span 2' },
  { day: 11, title: 'Chamada surpresa', message: 'Liga a um avô, a uma avó, ou a quem faça esse papel na tua vida.', motif: 'bell', size: '2x1', gridArea: '6 / 3 / span 1 / span 2', gridAreaMobile: '10 / 3 / span 1 / span 2' },
  { day: 12, title: 'Estrela de papel', code: 'ADVENTO-12', message: 'Procura "estrela de papel 3D" e faz uma para o topo da árvore.', motif: 'star', size: '1x2', gridArea: '1 / 5 / span 2 / span 1', gridAreaMobile: '9 / 1 / span 2 / span 1' },
  { day: 13, title: 'Dia de doçura', message: 'Prova um doce de Natal que nunca tenhas experimentado.', motif: 'bauble', size: '2x2', gridArea: '6 / 1 / span 2 / span 2', gridAreaMobile: '1 / 3 / span 2 / span 2' },
  { day: 14, title: 'Carta ao futuro', message: 'Escreve uma nota para leres no dia 1 de janeiro.', motif: 'snowflake', size: '1x2', gridArea: '7 / 3 / span 2 / span 1', gridAreaMobile: '11 / 2 / span 2 / span 1' },
  { day: 15, title: 'Metade do caminho', code: 'ADVENTO-15', message: 'Já abriste quinze portas. Copia o código e celebra com quem estás.', motif: 'bauble', size: '1x1', gridArea: '8 / 5 / span 1 / span 1', gridAreaMobile: '14 / 4 / span 1 / span 1' },
  { day: 16, title: 'Caminhada ao frio', message: 'Vinte minutos lá fora, mesmo que esteja cinzento.', motif: 'tree', size: '2x2', gridArea: '1 / 6 / span 2 / span 2', gridAreaMobile: '3 / 1 / span 2 / span 2' },
  { day: 17, title: 'Cinema em casa', code: 'FILME-17', message: 'Clássico de Natal, luzes apagadas, telemóvel na outra sala.', motif: 'stocking', size: '2x1', gridArea: '6 / 6 / span 1 / span 2', gridAreaMobile: '11 / 3 / span 1 / span 2' },
  { day: 18, title: 'Arruma um cantinho', message: 'Escolhe uma gaveta e deixa-a melhor do que estava.', motif: 'tree', size: '1x1', gridArea: '3 / 5 / span 1 / span 1', gridAreaMobile: '14 / 1 / span 1 / span 1' },
  { day: 19, title: 'Elogio anónimo', message: 'Deixa um elogio sincero a alguém, sem assinar.', motif: 'bell', size: '1x1', gridArea: '4 / 5 / span 1 / span 1', gridAreaMobile: '14 / 2 / span 1 / span 1' },
  { day: 20, title: 'Conta uma história', code: 'ADVENTO-20', message: 'Pergunta a alguém mais velho como era o Natal quando tinha a tua idade.', motif: 'stocking', size: '2x1', gridArea: '8 / 1 / span 1 / span 2', gridAreaMobile: '12 / 3 / span 1 / span 2' },
  { day: 21, title: 'Solstício de Inverno', message: 'A noite mais longa do ano. A partir de amanhã os dias voltam a crescer.', motif: 'snowflake', size: '2x2', gridArea: '7 / 6 / span 2 / span 2', gridAreaMobile: '7 / 3 / span 2 / span 2' },
  { day: 22, title: 'Embrulha à mão', code: 'PRENDA-22', message: 'Um presente, papel simples, fio de cozinha e um raminho verde.', motif: 'gift', size: '1x2', gridArea: '3 / 1 / span 2 / span 1', gridAreaMobile: '9 / 2 / span 2 / span 1' },
  { day: 23, title: 'Mesa posta', message: 'Ajuda a preparar a mesa da consoada, nem que seja só a dobrar guardanapos.', motif: 'bell', size: '2x1', gridArea: '7 / 4 / span 1 / span 2', gridAreaMobile: '13 / 1 / span 1 / span 2' },
  { day: 24, title: 'Véspera', code: 'ADVENTO-24', message: 'Última porta antes do Natal. Copia o código e respira: chegaste.', motif: 'candle', size: '1x2', gridArea: '3 / 2 / span 2 / span 1', gridAreaMobile: '11 / 1 / span 2 / span 1' },
  { day: 25, title: 'Feliz Natal', code: 'ADVENTO-08-12-15-20-24', message: 'Juntaste os códigos secretos. Aqui fica o teu prémio: um dia inteiro sem pressa nenhuma.', motif: 'tree', size: '2x2', gridArea: '4 / 3 / span 2 / span 2', gridAreaMobile: '3 / 3 / span 2 / span 2' },
];
