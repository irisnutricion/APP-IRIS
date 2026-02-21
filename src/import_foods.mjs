import { promises as fs } from 'fs';

const dataString = `Pan wasa 	334	62	9	1,5
Judías verdes en lata	23	3,5	1,7	0,2
Pasta de garbanzos	370	52	21	6,5
Cruasán de Chocolate Mini de Mercadona	480	44	6,3	31
Batido + proteínas chocolate (Hacendado)	46	2,3	7,9	0,5
Cacaolat Pro High Protein	59	4,1	9,1	0,4
Cacaolat (Original)	67	10,7	2,7	1,6
Cereales de espelta integral (Mercadona)	364	66	14,6	2,7
Canelones precocidos (Hacendado)	350	72,6	11,5	1,5
Curry	195	15,1	12,9	9,2
Galleta Príncipe	469	71	6,2	17
Galleta Belvita Chocolate	433	65	7,7	14
Tiras vegetarianas (Lidl)	170	6,2	19,9	6
Cereales de avena crunchy Chocolate (Hacendado)	485	64	8	20
Chuletas de pavo	110	0	22	2,5
Setas	34	6,8	2,2	0,5
Obleas de papel de arroz	320	79	5	0,35
Queso Provolone ( Zanetti)	360	0,7	24	29
Avellanas	628	17	15	61
Queso ricotta	140	5	11	8
Pan Wasa Fibra (Mercadona)	333	46	13	5
Azúcar	400	100		
Grana Padano 	390	0	32	29
Quinoa hinchada	378	71,6	10	4,7
Miel	3330,1	82,8	0,4	
Wrap integral de avena (hacendado)	287	40	15	6
Queso Emmental	390	1,5	28	30
Habas tiernas en conserva natural	71	8,4	5,7	0,5
Requesón Hacendado	160	5,4	8,7	11,6
Muesli Crunchy 0% azúcares 0% edulcorantes	401	52	8,8	12
Grano de avena cocido	168	25	6,7	3,5
Yuca	120	28	1,4	0,3
Barrita Nakd	353	53,1	8,7	13,2
Queso batido semi (Hacendado)	72	3,3	7,5	3,2
Leche entera sin lactosa	64,66	4,7	3,3	3,7
Mix de Cereales (Hacendado)	389	74	10	4
Muesli Crunchy Hacendado 0% azúcares añadidos y 0% edulcorantes	401	52	8,8	12
Requesón (Hacendado)	160	5,4	8,7	11,6
Mantequilla sin sal añadida (Hacendado)	730	0,8	0,5	82
Olivas	100	3	1	11
Cous cous integral (mercadona)	343	65	12	2
Gulas	160	5	10	11
Arroz Salvaje	346	67,6	9,8	3,1
Hummus casero	292	24	8	18
Bonito fresco	132	0	23,5	4,5
Wrap integral (hacendado)	288	45	9,5	6,2
Lechuga (romana o similar)	16,58	1,2	1,2	0,3
	Arroz blanco de grano largo, crudo	351,66	78,7	7,1	0,7
	Arroz blanco, crudo	346,22	77,9	6,6	0,6
	Avellanas	653,95	7	15	60,8
	Crackers sin gluten, con semillas	432,36	56,1	11,3	15,8
100% Real Whey Protein (Prozis)	394	3,4	76	8,5
100% Vegan Protein (Prozis)	390	2,4	82	5,8
100% Whey Hydro Isolate (Prozis)	406	2,9	91	3,4
100% Whey Protein Isolate (HSN)	385	1,2	93	1
Abadejo	86,58	0	24,9	1,3
Aceite de coco	891,54	0	0	99,1
Aceite de girasol	900	0	0	100
Aceite de oliva	900	0	0	100
Aceituna	119,22	4,4	0,8	10,9
Acelga	17,56	2,1	1,8	0,2
Aguacate	160,66	1,8	2	14,7
Aguja de vaca	134,11	0	21,1	5,5
Ajo	153,78	31	6,4	0,5
Albaricoque	204,5	38	4,7	3,3
Alcachofa	34,87	5,1	3,3	0,2
Alcachofa hervida	39,62	6,3	2,9	0,3
Alga wakame	45	0	3	0
Alita de pavo	191,76	0	20,2	12,3
Alita de pollo	185,73	0	17,5	12,9
Almejas	57,29	0	10,7	1,6
Almendras	595,17	9,1	21,2	49,9
Altramuces	318,22	21,5	36,2	9,7
Altramuces cocidos	122,48	7,1	15,6	2,9
Alubias en conserva	72,56	8,8	5,5	0,3
Alubias pintas crudas	244,59	35,4	23	1,2
Anacardos	581,69	26,9	18,2	43,9
Anchoas conserva	202,95	0	28,9	9,7
Anchoas en conserva de aceite de oliva	215,5	0	28	11,5
Anguila fresca	178,7	0	18,4	11,7
Apio	12,9	1,4	0,7	0,2
Arándanos	54,29	12,1	0,7	0,3
Arándanos rojos	36,49	8,4	0,5	0,1
Arenque fresco	153,2	0	18	9
Arepa maíz amarillo (el dorado) (1ud)	191	42,2	4,4	0
Arroz blanco de grano corto, crudo	347,28	79,2	6,5	0,5
Arroz blanco, cocido	126,87	28,7	2,4	0,2
Arroz de grano largo, cocido	125,16	27,8	2,7	0,3
Arroz integral	365,72	76,2	7,5	2,7
Arroz integral cocido	125,29	25,6	2,7	1
Arroz integral largo (mercadona)	353	72	9	2
Atún en conserva en aceite	178,84	0	26,5	8,1
Atún en conserva natural	99,4	0	23,5	0,6
Atún fresco	137,42	0	23,3	4,9
Atún rojo fresco	137,42	0	23,3	4,9
Bacalao en conserva	98,78	0	22,8	0,9
Bacalao fresco	81	0	18	1
Bacalao seco y salado	272,61	0	62,8	2,4
Bacon	388,97	0	13,7	37,1
Bacon de pavo	223,69	1,9	15,9	16,9
Bebida de almendras sin azúcar	15,08	1,1	0,4	1
Bebida de arroz	45,33	8,9	0,3	1
Bebida de avellanas	27,8	2,8	0,4	1,6
Bebida de avena	42,3	5,8	1	1,5
Bebida de soja	32,17	1,3	2,9	1,7
Berberechos	47,3	0	10,7	0,5
Berenjena	17,06	2,9	1	0,2
Berros	13,26	0,8	2,3	0,1
Besugo	88,68	0	18,1	1,8
Beyond sausage (salchicha vegana)	237	3	16	17
Bimi	19,92	2,1	1,2	0,8
Boniato	81,2	17,1	1,6	0,1
Bonito en conserva en aceite	147,49	0	26,2	4,7
Boquerón	124,96	0	20,4	4,8
Boquerón en conserva	202,95	0	28,9	9,7
Brócoli	35,97	4	2,8	0,4
Burrata (Hacendado)	240	1,9	13	20
Caballa en conserva	149,46	0	23,2	6,3
Caballa fresca	199,41	0	18,6	13,9
Cacahuetes	593,32	6,3	26,2	49,6
Cacao en polvo	359,3	20,9	19,6	13,7
Café	0	0	0	0
Calabacín	16,16	2,1	1,2	0,3
Calabaza	28,9	6	1	0,1
Calamares	87,06	3,1	15,6	1,4
Caldo de pescado	15	0,4	2	0,6
Callos de ternera	81,49	0	12,1	3,7
Canónigos	14,4	0,7	2	0,4
Capón  (pollo fresco con piel)	228,71	0	18,8	17,1
Caqui	63,99	15	0,6	0,2
Cardo	13,58	2,5	0,7	0,1
Careta de cerdo ibérico	537	0	20,4	50,6
Carne blanca	119	0	23	3
Carne de cabra	103,19	0	20,6	2,3
Carne de cabra, asada	135,67	0	27,1	3
Carne de kebab (Hacendado)	191	2,7	22,4	10
Carne de res, magra	124,84	0	22	4
Carne picada	247	0	19	19
Carne picada de cerdo	258,4	0	16,9	21,2
Carne picada de pavo	157,22	0	20,2	8,5
Carne picada de pollo	142,82	0	17,4	8,1
Carne picada de ternera	191,86	0	18,6	13,1
Carne roja	209	0	23	13
Carpa pescado	121,72	0	17,8	5,6
Carrilleras de cerdo	652,01	0	6,4	69,6
Cebolla	35,86	7,6	1,1	0,1
Cebolla morada	36	7	1	0
Cebolleta	27,99	4,7	1,8	0,2
Cecina (ternera curada)	241,5	0	39	9,5
Cereales de avena crunchy (Hacendado)	390	66	13	5,6
Cereales eko (nestlé)	346	74,8	4,4	6,5
Cereales salvado trigo fibra sticks (Hacendado)	344	51	15	2,8
Cerezas	49,02	10,6	1	0,3
Champiñones	24,46	2,3	3,1	0,3
Chipirones	80	0	17	0
Chirimoya	85,6	19	1	0,2
Chirivías	59,86	13,1	1,2	0,3
Chistorra 	513,6	0,9	15	50
Chocolate negro	576,63	35	7,8	44
Chopped (de cerdo y ternera)	226,24	2,6	15,3	17,2
Chorizo	330,12	3,8	27	23
Chuletas de cerdo	116,56	0,2	21,1	3,5
Chuletas de cordero	155	1,6	17	9
Chuletón de ternera (crudo)	268,67	0	17,5	22,1
Chuletón de ternera a la plancha	257,16	0	26,6	16,8
Ciruelas	45,4	10	0,7	0,3
Clara de huevo	48,05	0,7	10,9	0,2
Clementinas	46,03	10,3	0,9	0,2
Coco fresco	339,65	6,2	3,3	33,5
Coco rallado	670,29	7,4	6,9	64,5
Col blanca	20,9	3	2	0,1
Col lombarda	32,44	5,3	1,4	0,2
Col rizada	34,57	0,3	2,9	1,5
Coles de bruselas	36,82	5,2	3,4	0,3
Coliflor	22,08	3	1,9	0,3
Conejo	130,15	0	20,1	5,6
Contramuslo de pavo	138,64	0	19,5	6,7
Contramuslo de pollo	113	0	19	4
Copos de avena	361,88	57,6	13,2	6,5
Corazones de alcachofa en conserva	22	2	2	0
Cordero	308,4	0	25,2	23,1
Cordero, costillar	256,38	3,3	17,3	18,5
Cordero, paletilla	217	0	25	13
Corn flakes (kellogg's)	378	84	7	0,9
Costilla de cerdo (frescas)	272,48	0	15,5	23,4
Costilla de ternera (asada)	464,1	0	21,6	42
Costilla de ternera (cruda)	385,27	0,4	14,4	36,2
Costillas de cerdo, magras	171,96	0	20,9	9,8
Crackers con semillas	432,36	56,1	11,3	15,8
Crackers de arroz y maíz sin gluten	450,45	73,9	2,5	15,4
Creatina	400		100	
Crema de almendra (Prozis)	628	9,7	22	53
Crema de cacahuete	612,77	13,2	25,7	50,8
Crema de cacahuete en polvo	414	18	47	14
Crema de coco	344,44	4,5	3,6	34,7
Cuajada	95	6,9	4,9	5,3
Cuarto trasero de pollo crudo sin piel	114,62	0	19,2	4,2
Dátiles	297,43	67	2,5	0,4
Dátiles	282	75	2,5	0,4
Dorada	132,98	0	17	7,2
Edamame	176,3	13,3	13,3	6,7
Embutido de pavo	206,85	4,2	11,4	16,1
Endivia	7,8	0,3	1,3	0,2
Entrecot de ternera a la plancha	212,84	0	27,7	11,4
Entrecot de ternera crudo	275,53	0	19	22,2
Espaguetis de espinaca	345,57	64,2	13,4	1,6
Espárragos blancos en conserva	15,9	2,5	0,8	0,3
Espárragos verdes	17	1,8	2,2	0,1
Espinacas congeladas	28,27	1,1	4	0,9
Espinacas frescas	25,07	1,4	2,9	0,4
Evohydro 2.0 (HSN)	374	1,8	89	1,1
Evonative Whey (HSN)	386	8,9	72	6,3
Evowhey 2.0 (HSN)	362	6,5	74	3,8
Fideos soba integrales	152	72	13	3
Filete de solomillo de ternera a la plancha	188,68	1,1	28,2	8
Filete de solomillo de ternera fresco	137,74	0	21,3	5,8
Filete de ternera	157,84	0	22,2	7,7
Fletán, fresco	86,21	0	18,6	1,3
Frambuesas	32,41	5,4	1,2	0,7
Fresas	32,1	5,7	0,7	0,3
Frijoles negros enlatados	85	15	4,6	1,5
Fruta	91,5	21,1	0,8	0,2
Frutas de la pasión (Maracuya)	67,02	13	2,2	0,7
Frutos rojos	32,7	5,5	1	0,3
Frutos rojos	32,7	5,5	1	0,3
Gallo, fresco	80,3	0	15,8	1,9
Gamba/langostinos cocidos	99,24	0,2	24	0,3
Garbanzos crudos	398,76	61	19	6
Garbanzos en conserva	130,45	16,1	7,1	2,8
Gazpacho (hacendado)	75	2,5	0,6	7
Gelatina de fresa 0% azúcar (Hacendado)	4			
Granadas	76,01	14,7	1,7	1,3
Grosellas	32,26	5,9	0,9	0,6
Guisantes verdes congelados	71,07	9,8	5,2	0,3
Guisantes verdes en conserva	73,15	11,8	4,3	1
Guisantes verdes frescos	71,68	8,8	5,4	0,4
Habas	251,41	33,3	26,1	1,5
Habs en conserva	58,7	8,7	5,5	0,2
Hamburguesa de carne blanca	156,5	0	20	8,5
Hamburguesa de carne de cerdo	258,4	0	16,9	21,2
Hamburguesa de carne roja	223,5	0	16,5	17,5
Hamburguesa de Heura	180	4,6	19	8,8
Hamburguesa de pavo	156,5	0	20	8,5
Hamburguesa de pollo	142,82	0	17,4	8,1
Hamburguesa de seitán - Hacendado	204	2,5	19,7	11,6
Hamburguesa de ternera	189	0	18	13
Harina	340,74	60,6	12,6	3,1
Harina de avena (HSN)	391	68	12	7
Harina de Avena (Prozis)	385	69	12	6
Harina de avena y proteína whey (Prozis)	379	43	31	7,4
Harina de cacahuete desgrasada 	289,35	18,9	52,2	0,6
Harina de garbanzo	359,45	47	22,4	6,7
Harina de maíz integral	357,75	69,6	8,1	3,6
Harina de patata	339,46	77,2	6,9	0,3
Harina integral	322	64	12,6	1,7
Harina sin gluten	340,74	60,6	12,6	3,1
Heura	119,7	0,7	18,6	3,1
Hígado de cerdo	128,29	2,5	21,4	3,7
Hígado de pavo	122,54	0	18,3	5,5
Hígado de pollo crudo	114,07	0,7	16,9	4,8
Hígado de ternera	135,01	2,9	19,9	4,9
Hígado de ternera a la plancha	185,95	4,5	27,4	6,5
Higo chumbo	31,39	6	0,7	0,5
Higos	70,82	16,3	0,8	0,3
Huevas de pescado, frescas	153,06	1,5	22,3	6,4
Huevo	138,71	0,7	12,6	9,5
Huevo de codorniz	153,65	0,4	13,1	11,1
Hummus de garbanzo (Hacendado)	300	8,7	6,4	25
Impact Whey Isolate (MyP)	373	2,5	90	0,3
Impact Whey Protein (MyP)	412	4	82	7,5
Jamón cocido (jamón york)	102,62	2,3	18,4	1,9
Jamón ibérico	333	0	27	25
Jamón serrano	222,2	0	31,7	10,6
Jamón serrano, magro	130,61	0	20,5	5,4
Judías blancas	311,77	45,1	23,4	0,9
Judías verdes	26,38	4,3	1,8	0,2
Kéfir (Hacendado)	74	5,1	3,9	4,2
Keto Whey Protein (HSN)	447	7	68	16
Kimchi	30	7	1	0
Kimchi (repollo)	12,1	0,8	1,1	0,5
Kiwi	64,16	14,39	1,02	0,28
Kiwi verde	55,88	11,7	1,1	0,5
Lacón	174	0	19,2	10,8
Lacón (El Pozo)	112	0,5	19,4	3,5
Leche + proteina (Hacendado)	56	4,6	6	1,5
Leche de cabra	69,3	4,5	3,6	4,1
Leche de cabra sin lactosa	69,3	4,5	3,6	4,1
Leche de coco	31,24	2,9	0,2	2,1
Leche desnatada de vaca	34,04	5	3,4	0,1
Leche entera de vaca	64,66	4,7	3,3	3,7
Leche evaporada (Hacendado)	109	11	7,4	4
Leche semidesnatada de vaca	45,15	4,7	3,2	1,6
Leche sin lactosa	66,65	5,4	3,8	3,3
Lechuga hoja verde	15,67	1,2	1,2	0,3
Lechuga iceberg	11,94	1,8	0,9	0,1
Lengua de ternera, cruda	125,68	1,9	17,2	5,5
Lenguado fresco	77,7	0	16,5	1,3
Lentejas	340,06	52,7	24,6	1,1
Lentejas en conserva	87	13	6,6	
Life Pro Isolate Zero 	366,3	3,3	84	1,4
Life Pro Whey (LifePro)	403	6,8	78,3	6,2
Limón 	33,18	6,5	1,1	0
Lomo de cerdo, fresco	160	1	20	6,1
Lomo de ternera, fresco	126	0	22,5	4
Lomo embuchado	205	1,5	34	7
Lomo, filetes frescos	153	0	18	9
Lubina fresca	108,65	0	18,9	3,7
Maíz	69	12,3	2,3	1,2
Mandarinas	52,19	11,5	0,8	0,3
Mango	60,22	13,4	0,8	0,4
Manitas/ pies de cerdo	205,95	0	23,2	12,6
Mantequilla batida	706,66	0	0,5	78,3
Mantequilla de almendra 	645	21,6	21,2	49,4
Mantequilla de cacahuete	615	10,9	28	49
Manzana	53,2	12	0,3	0
Masa de pizza (Hacendado)	283	53,4	6,5	4,4
Mayonesa	679,77	0,6	1	74,9
Mejillones 	67,8	0	11,9	2,2
Melocotón	38,05	8	0,9	0,3
Melón	28,06	5,7	1,1	0,1
Melva	99,4	0	23,5	0,6
Membrillo	56,1	13,4	0,4	0,1
Menudillo de pollo crudos	118,95	1,8	17,9	4,5
Merluza	78,08	0	17,5	0,9
Mermelada	275	68	0,5	0,1
Mero fresco	86,7	0	19,4	1
Miso	190	22,1	10,9	5,1
Molleja de pavo fresca	105,53	0	18,8	3,4
Molleja de pollo cruda	89,18	0	17,7	2,1
Moras	27,21	4,3	1,4	0,5
Morcilla	374,06	1,3	14,6	34,5
Morcillo de ternera	106,91	0	22,1	2,1
Mortadela con aceitunas	232,5	9,2	11,8	16,5
Mozarella fresca	297,54	2,4	22,2	22,1
Mozzarella	318,04	2,5	21,6	24,6
Mújol, fresco	124,4	0	15,8	6,8
Muslito o muslo de pollo	155,56	0,1	18,1	9,2
Muslo de pavo (asado y con piel)	182,94	0,4	24	9,5
Muslo de pavo (fresco y con piel)	160,6	0	19,5	9,2
Muslo de pavo (fresco y sin piel)	108,22	0,2	21,3	2,5
Muslo de pollo asado con piel	184,75	0	23,4	10,2
Muslo de pollo asado sin piel	148,26	0	24,2	5,7
Nabos	23,02	4,6	0,9	0,1
Naranja	47,04	9,4	0,9	0,1
Nata líquida ligera	133,22	4,3	3,1	11,5
Nata líquida para cocinar	188	4	2,5	18
Natillas proteicas	77	5,8	10	1,5
Nectarinas	42,52	8,9	1,1	0,3
Níspero	45,28	10,4	0,4	0,2
Noodles de arroz (mercadona)	343	77	6,4	0,6
Nueces	689,25	7	15,2	65,2
Nueces de brasil	678,14	4,2	14,3	67,1
Nueces de macadamia	734,45	5,2	7,9	75,8
Nuggets de pollo 	265,82	20,7	15,7	12,9
Ñoquis	116	31	5,3	2,3
Paleta de cerdo (fresca)	142,46	0	19,6	7,1
Palometa	96,2	0	20	1,8
Pan blanco, tostado	284,2	51,6	9	4
Pan de bagel (bimbo)	296	51	11	4,1
Pan de hamurguesa	271	47,5	7,54	5
Pan de molde	252,5	45,7	7,3	3,7
Pan de trigo 	256,61	43,5	10,7	4,5
Pan integral	240,14	36,7	12,5	3,5
Pan sin gluten	238,92	41,5	4,3	5,2
Panceta de cerdo	514,45	0	9,3	53
Panela	320	80		
Papaya	40,7	9,1	0,5	0,3
Pargo fresco	94,1	0	20,5	1,3
Pasas	315,22	71,7	2,5	0,5
Pasta	358,03	71,5	13	1,5
Pasta de lenteja roja	336,6	48,8	27	1,4
Pasta fresca	291,26	54,7	11,3	2,3
Pasta integral	358,03	71,5	13	1,5
Pasta sin gluten 	343,6	68,3	7,5	2,1
Patata	74,77	15,39	2,05	0,09
Paté de foies gras ahumado	458,84	4,7	11,4	43,8
Paté de hígado de oca ahumado enlatado	458,84	4,7	11,4	43,8
Paté de hígado de pollo enlatado	197,9	6,6	13,5	13,1
Paté pollo para untar	245,08	3,8	18	17,6
Pato crudo y con piel	400,02	0	11,5	39,3
Pavo entero fresco con piel	137,88	0,1	21,6	5,6
Pechuga de pato	117,65	0	19,9	4,3
Pechuga de pavo, embutido	88,6	5	14	1,4
Pechuga de pavo, fresca	93,2	0,2	20	1,4
Pechuga de pollo	89	0	20	1
Pepinillos encurtidos	10,34	1,4	0,5	0,3
Pepino	16,11	3,1	0,7	0,1
Peras	51,22	12,1	0,4	0,1
Perca fresca	75,1	0	15,3	1,5
Perejil fresco	31,11	3	3	0,8
Persimón	140,8	33,5	0,8	0,4
Pescadilla fresca	85,03	0	18,3	1,3
Pescado azul	182	0	23	10
Pescado blanco	69	0	15	1
Pesto salsa fresca - Hacendado 	525	11	4	51
Pez emperador	138,49	0	19,7	6,7
Pez lisa fresco	111,51	0	19,4	3,8
Pimiento amarillo	27,57	5,4	1	0,2
Pimiento rojo	26,58	3,9	1	0,3
Pimiento verde	16,73	2,9	0,9	0,2
Pintarroja o cazón fresco	124,51	0	21	4,5
Piña	52,9	11,7	0,5	0,1
Pistachos	554,8	16,6	20,2	45,3
Plátano amarillo	129,1	30,2	1,3	0,4
Plátano verde	147,87	34,5	1,3	0,1
Pollo asado sin piel	105,62	0	20,3	2,7
Pollo fresco y con piel	253,17	0	17,6	20,3
Pollo hervido 	107	0,6	23,4	1,2
Pollo sin piel	113,28	0	21,4	3,1
Pomelo	31,34	7	0,6	0,1
Proteina de guisante aíslada 2.0	400	3,8	73	8,5
Proteína en polvo	124,51	0	21	4,5
Proteína Paleobull	379,37	2,78	86,37	2,53
Proteína texturizada de guisante	347	16,6	49,8	5
Puerro	58,1	12,4	1,5	0,3
Pulpo cocido	138	0	29,8	2,1
Queso azul	353,62	2,3	21,4	28,7
Queso brie	333,92	0,5	20,8	27,7
Queso cheddar	375,91	1,6	22,2	31,2
Queso cheddar bajo en grasa	168	1,9	24,4	7
Queso cheddar sin grasa	157,12	7,1	32,1	0
Queso cottage	99	1,7	14	4
Queso crema	356,64	5,5	6,2	34,4
Queso crema	56,64	5,5	6,2	34,4
Queso de cabra	355,36	0,1	21,6	29,8
Queso de cabra	355,36	0,6	21,6	29,8
Queso de cabra sin lactosa	355,36	0,1	21,6	29,8
Queso feta	265,77	3,9	14,2	21,5
Queso fresco	298	3	18,1	23,8
Queso fresco batido semi (Hacendado)	72	3,3	7,5	3,2
Queso fresco sin lactosa	298	3	18,1	23,8
Queso Havarti	371	2,79	23,24	29,68
Queso mozzarella rallado	281	1	22	21
Queso parmesano	380,88	3,22	35,75	25
Queso rallado semicurado	343	0	25	27
Queso semicurado	318,04	2,5	21,6	24,6
Queso semicurado sin lactosa 	318,04	2,5	21,6	24,6
Quinoa	114,48	18,5	4,4	1,9
Quinoa	353,75	57,2	14,1	6,1
Quinoa cocinada	160	22	7	3,4
Rábano	13,02	12,4	1,5	0,3
Rabo de cerdo	372,5	0	17,8	33,5
Rape fresco	71,6	0	14,5	1,5
Raya, fresca	93,58	0	20,6	1,3
Redondo de ternera a la plancha	213,59	0	33,1	9
Remolacha cruda	35,01	6,8	1,6	0,2
Repollo	19,22	3,3	1,3	0,1
Riñón de cerdo	95,09	0	16,5	3,3
Riñones crudos de ternera	94,52	0,9	15,8	3,1
Rodaballo fresco	90,75	0	16,1	3
Rúcula	27,66	2,1	2,6	0,7
Salami	372,01	0,7	21,1	31,7
Salchicha de cerdo	285,82	3	3,9	24,3
Salchicha de frankfurt	289,56	4,2	10,3	25,8
Salchicha de frankfurt de pollo	218,71	2,7	15,5	16,2
Salchicha de pavo fresca	149,76	0,5	18,8	8,1
Salchicha fresca	3017,76	0,9	13	28
Salmón ahumado	208,4	2,1	23	12
Salmón en conserva	202,46	0	20,4	13,4
Salmón fresco	202,46	0	20,4	13,4
Salmorejo (brick de mercadona)	85	5,1	1,1	6,4
Salsa de soja	63,62	4,8	10,5	0,1
Sandía	32,39	7,2	0,6	0,2
Sardinas en conserva natural	161	0,5	25	6,6
Sardinas frescas	139,9	0	18,1	7,5
Sargo fresco	102,53	0	20,2	2,4
Seitán	121	3,5	24,5	1,55
Semillas de calabaza	593,21	4,7	30,2	49,1
Semillas de chía	442,5	7,7	16,5	30,7
Semillas de girasol	609,06	11,4	20,8	51,5
Semillas de lino	513,52	1,6	18,3	42,2
Semillas de sésamo peladas	656,41	0,1	20,5	61,2
Sepia	79,4	0	17,6	1
Sesos de cerdo frescos	124,01	0	10,3	9,2
Sesos de ternera (vísceras)	140,34	1,1	10,9	10,3
Soja	356,1	31,3	55,7	0,9
Soja texturizada	356,1	31,3	55,7	0,9
Solomillo de cerdo	122,81	0	23,8	3,1
Solomillo de pollo	131,52	0	19,6	5,9
Solomillo de ternera	134,5	0	23,5	4,5
Spaghetti de Garbanzos	340,2	49,4	20,3	4,2
Tabulé oriental (Aldi)	665	23	4,2	5,1
Tahini (Hacendado)	710	3,2	24,9	65,6
Tempeh	174	1,6	17,6	9,4
Ternera, magra	124,8	0,2	22	4
Tofu	110	0,9	11,1	6,9
Tomate	23,28	3,9	0,9	0,2
Tomate frito	250	5,6	0,9	3,3
Tomate natural	250	5,6	0,9	3,3
Tortellinis rellenos de queso  (frescos, sin cocer)	303,27	45,1	13,5	7,2
Tortitas de arroz	375	77,3	8,2	2,8
Tortitas de arroz con chocolate negro	477	65	6,8	20
Tortitas de avena y arroz (Hacendado)	389	74	9,2	5
Tortitas de legumbre	366	55	25	0,7
Tortitas de maíz	366	80	7	1,8
Trucha	202,46	0	20,4	13,4
Uvas	55,39	10	0,8	0,5
Ventresca en conserva natural	192	0	25	10
Vuna (Atún vegano)	279	1,7	23	20
Weetabix (cereales de grano entero)	374,66	70,1	11,4	2,9
Weetabix (con chicolate)	386	70	10	5,1
Wrap	290,84	36,1	9,8	9,8
Yema de huevo	316,66	3,6	15,9	26,5
Yogur azucarado	66,44	11	3	1,2
Yogur de almendras	150	12,7	1,9	4,6
Yogur de cabra sin lactosa	84	3	6,47	5
Yogur de coco (Alpro)	55	2,3	3,9	3
Yogur de soja 	79	2,3	4,1	5
Yogur desnatado edulcorado (mercadona)	36	4,9	4,8	0
Yogur griego	169	16,1	4,1	9,8
Yogur griego de stracciatella (Hacendado)	163	16,5	3,4	9,3
Yogur natural sin lactosa	38,44	4	3	1,2
Yogur proteico	60	5	8,3	0,1
Yogur proteico sin lactosa (Kaiku)	79	9,8	9	0
Yogur sin azúcar	38,44	4	3	1,2
Zanahoria baby	26,16	4,4	0,6	0,7
Zanahorias	33	6,8	0,9	0,2`;

const NON_VEGAN_REGEX = /pollo|ternera|pavo|cerdo|pescado|atún|anchoa|salmón|sardina|huevo|leche|queso|mantequilla|nata|yogur|kéfir|miel|bacon|jamón|gamba|gula|abadejo|almeja|anguila|arenque|bacalao|berberecho|besugo|boquerón|caballa|calamar|chipirón|chopped|chistorra|chorizo|chuleta|costilla|dorada|gallo|langostino|lenguado|lubina|mejillón|melva|pargo|pulpo|rape|raya|rodaballo|salami|salchicha picada|víscera|yema|clara|vaca|buey|cordero|cabra|capón|conejo/i;
const DIARY_REGEX = /leche|queso|mantequilla|nata|yogur|kéfir|burrata|cuajada|mozzarella|parmesano|provolone|ricotta/i;
const GLUTEN_REGEX = /trigo|espelta|centeno|cebada|pan|galleta|canelones|pasta |fideos|croissant|cruasán|wrap|bagel|ñoquis/i;
const EGG_REGEX = /huevo|clara|yema|mayonesa/i;
const NUT_REGEX = /almendra|nuez|nueces|cacahuete|anacardo|avellana|pistacho|macadamia/i;
const LEGUME_REGEX = /garbanzo|lenteja|judía|alubia|soja|guisante|edamame|altramuz|cacahuete|tofu|tempeh|haba|frijol|habs/i;
const LOW_FODMAP_EXCLUDED_REGEX = /cebolla|ajo|legumbre|trigo|manzana|pera|melocotón|cereza|sandía|lactosa|puerro/i;
const BRANDS_REGEX = /hacendado|mercadona|lidl|zanetti|prozis|nestlé|kellogg's|el dorado|heura|hsn|myp|el pozo|alpro|kaiku|aldi|bimbo|paleobull|life pro|myprotein/i;

function parseNumber(str) {
    if (!str || !str.trim()) return 0;
    const parsed = parseFloat(str.replace(',', '.'));
    return isNaN(parsed) ? 0 : parsed;
}

const lines = dataString.split('\n').filter(l => l.trim().length > 0);
const parseLine = (line) => {
    let parts = line.split('\t').map(p => p.trim());
    if (parts.length < 5) {
        // Handle weirder spacing
        parts = line.split(/\s{2,}|\t/).map(p => p.trim());
    }

    if (parts.length < 5) parts = [...parts, '', '', '', '', ''];

    const name = parts[0].replace(/'/g, "''"); // escape for SQL
    const kcal = parseNumber(parts[1]);
    const carbs = parseNumber(parts[2]);
    const protein = parseNumber(parts[3]);
    const fats = parseNumber(parts[4]);

    let tags = [];

    // Si es comercial, solo lleva esta etiqueta (petición de la usuaria)
    if (BRANDS_REGEX.test(name)) {
        tags.push('producto_comercial');
    } else {
        // Logica normal para no comerciales
        const isMeatAnalogue = /soja texturizada|tofu|tempeh|seitán/i.test(name);

        // Vegano
        if (!NON_VEGAN_REGEX.test(name) || isMeatAnalogue) {
            tags.push('vegano');
            tags.push('vegetariano');
        } else if (!/pollo|ternera|pavo|cerdo|pescado|atún|anchoa|salmón|sardina|bacon|jamón|gamba|gula|abadejo|almeja|anguila|arenque|bacalao|berberecho|besugo|boquerón|caballa|calamar|chipirón|chopped|chistorra|chorizo|chuleta|costilla|dorada|gallo|langostino|lenguado|lubina|mejillón|melva|pargo|pulpo|rape|raya|rodaballo|salami/i.test(name)) {
            tags.push('vegetariano');
        }

        // Sin gluten
        if (!GLUTEN_REGEX.test(name) || /sin gluten|arroz|maíz/i.test(name)) {
            if (!/seitan|seitán/i.test(name)) {
                if (/pan|pasta/i.test(name) && !/sin gluten|garbanzo|lenteja|arroz|maíz/i.test(name)) {
                    // it's gluten
                } else {
                    tags.push('sin_gluten');
                }
            }
        }

        // Sin lácteos
        if (!DIARY_REGEX.test(name) || /sin lactosa|almendra|soja|avena/i.test(name)) {
            if (!/whey|suero|casein|lactosa/i.test(name)) {
                tags.push('sin_lacteos');
            }
        }

        // Sin huevo
        if (!EGG_REGEX.test(name)) {
            tags.push('sin_huevo');
        }

        // Sin frutos secos
        if (!NUT_REGEX.test(name)) {
            tags.push('sin_frutos_secos');
        }

        // Sin legumbres
        if (!LEGUME_REGEX.test(name)) {
            tags.push('sin_legumbres');
        }

        // Bajo FODMAP (heuristic very conservative)
        if (!LOW_FODMAP_EXCLUDED_REGEX.test(name) && !DIARY_REGEX.test(name) && !LEGUME_REGEX.test(name)) {
            tags.push('bajo_fodmap');
        }
    }

    return {
        name,
        kcal_per_100g: kcal,
        carbs_per_100g: carbs,
        protein_per_100g: protein,
        fat_per_100g: fats,
        tags
    };
};

const foods = lines.map(parseLine);

async function generateSQL() {
    let sql = 'INSERT INTO public.foods (name, kcal_per_100g, carbs_per_100g, protein_per_100g, fat_per_100g, tags) VALUES\n';

    // Create values rows
    const rows = foods.map(food => {
        // PostgreSQL array syntax: '{"vegano", "vegetariano"}'
        const tagsStr = food.tags.length > 0 ? `'{${food.tags.map(t => '"' + t + '"').join(',')}}'` : "'{}'";
        return `('${food.name}', ${food.kcal_per_100g}, ${food.carbs_per_100g}, ${food.protein_per_100g}, ${food.fat_per_100g}, ${tagsStr}::text[])`;
    });

    sql += rows.join(',\n') + ';\n';

    // Generar sql update solo para los existentes
    let sqlUpdate = '';
    foods.filter(f => f.tags.includes('producto_comercial')).forEach(f => {
        sqlUpdate += `UPDATE public.foods SET tags = '{"producto_comercial"}'::text[] WHERE name = '${f.name}';\n`;
    });

    await fs.writeFile('update_commercial_foods.sql', sqlUpdate);
    console.log('Successfully wrote update_commercial_foods.sql to strip other tags from commercial products.');
}

generateSQL();
