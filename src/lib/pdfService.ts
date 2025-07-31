import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { storage } from './firebase';
import { ref, getDownloadURL } from 'firebase/storage';

export interface PDFProjectData {
  nome: string;
  cliente?: {
    nome: string;
    empresa: string;
    email: string;
  };
  customAccordions: Array<{
    title: string;
    items: Array<{
      title: string;
      subItems: Array<{
        id: string;
        title: string;
        evaluation: string;
        currentSituation?: string;
        clientGuidance?: string;
        photoData?: {
          url: string;
          createdAt: string;
          latitude: number;
          longitude: number;
        };
      }>;
    }>;
  }>;
}

export class PDFService {
  static async generateProjectPDF(projectData: PDFProjectData): Promise<void> {
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = margin;

    // Configurações de fonte
    pdf.setFont('helvetica');
    
    // Cabeçalho com logo e informações
    await this.addHeader(pdf, projectData, yPosition);
    yPosition += 40;

    // Informações do projeto
    yPosition = await this.addProjectInfo(pdf, projectData, yPosition);
    yPosition += 15;

    // Processar cada categoria (accordion)
    let ncCounter = 1;
    for (const accordion of projectData.customAccordions) {
      // Verificar se há itens com dados preenchidos
      const itemsWithData = accordion.items.filter(item => 
        item.subItems.some(subItem => 
          subItem.evaluation || 
          subItem.currentSituation || 
          subItem.clientGuidance || 
          subItem.photoData
        )
      );

      if (itemsWithData.length === 0) continue;

      // Título da categoria
      yPosition = await this.addCategoryHeader(pdf, accordion.title, yPosition);

      // Processar cada item
      for (const item of itemsWithData) {
        const subItemsWithData = item.subItems.filter(subItem => 
          subItem.evaluation || 
          subItem.currentSituation || 
          subItem.clientGuidance || 
          subItem.photoData
        );

        if (subItemsWithData.length === 0) continue;

        // Criar tabela de checklist para o item
        yPosition = await this.addChecklistTable(pdf, item.title, subItemsWithData, yPosition);
        yPosition += 10;

        // Processar cada subitem como NC
        for (const subItem of subItemsWithData) {
          if (subItem.evaluation === 'nc' || subItem.currentSituation || subItem.clientGuidance) {
            yPosition = await this.addNonConformitySection(pdf, ncCounter, subItem, yPosition);
            ncCounter++;
            yPosition += 10;
          }
        }
      }
    }

    // Salvar o PDF
    const fileName = `relatorio_auditoria_${projectData.nome.replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
    pdf.save(fileName);
  }

  private static async addHeader(pdf: jsPDF, projectData: PDFProjectData, yPosition: number): Promise<number> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;

    // Logo VERSYS (simulado com texto)
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('VERSYS Consultoria em Segurança Portuária', margin, yPosition);
    
    // Informações do relatório (lado direito)
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text('RELATÓRIO DE AUDITORIA INTERNA - ISPS CODE 2025', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
    pdf.text('JUNHO / 2025', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 6;
    pdf.text('PÁGINA 1 DE 1', pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 15;

    // Barra azul com título
    pdf.setFillColor(0, 51, 102);
    pdf.rect(margin, yPosition, pageWidth - (margin * 2), 8, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Auditoria Interna Checklist - Anexo E, Resolução 53/2020', pageWidth / 2, yPosition + 6, { align: 'center' });
    pdf.setTextColor(0, 0, 0);

    return yPosition + 15;
  }

  private static async addProjectInfo(pdf: jsPDF, projectData: PDFProjectData, yPosition: number): Promise<number> {
    const margin = 20;

    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Nome do Projeto:', margin, yPosition);
    yPosition += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(12);
    pdf.text(projectData.nome, margin + 5, yPosition);
    yPosition += 10;

    if (projectData.cliente) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Cliente:', margin, yPosition);
      yPosition += 8;
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${projectData.cliente.nome} - ${projectData.cliente.empresa}`, margin + 5, yPosition);
      yPosition += 8;
      pdf.text(`Email: ${projectData.cliente.email}`, margin + 5, yPosition);
      yPosition += 10;
    }

    pdf.setFont('helvetica', 'bold');
    pdf.text('Data do Relatório:', margin, yPosition);
    yPosition += 8;
    pdf.setFont('helvetica', 'normal');
    pdf.text(new Date().toLocaleDateString('pt-BR'), margin + 5, yPosition);

    return yPosition + 10;
  }

  private static async addCategoryHeader(pdf: jsPDF, categoryTitle: string, yPosition: number): Promise<number> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;

    // Verificar se precisa de nova página
    if (yPosition > 250) {
      pdf.addPage();
      yPosition = 20;
    }

    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(categoryTitle, pageWidth / 2, yPosition, { align: 'center' });
    
    return yPosition + 12;
  }

  private static async addChecklistTable(pdf: jsPDF, itemTitle: string, subItems: any[], yPosition: number): Promise<number> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);

    // Verificar se precisa de nova página
    if (yPosition > 220) {
      pdf.addPage();
      yPosition = 20;
    }

    // Título do item
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(itemTitle, margin, yPosition);
    yPosition += 10;

    // Cabeçalho da tabela
    pdf.setFillColor(240, 240, 240);
    pdf.rect(margin, yPosition, contentWidth, 8, 'F');
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Item', margin + 5, yPosition + 6);
    pdf.text('Descrição', margin + 30, yPosition + 6);
    yPosition += 10;

    // Linhas da tabela
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    
    for (let i = 0; i < subItems.length; i++) {
      const subItem = subItems[i];
      const itemNumber = `${i + 1}.${i + 1}`;
      
      // Linha da tabela
      pdf.rect(margin, yPosition, contentWidth, 8, 'S');
      pdf.text(itemNumber, margin + 5, yPosition + 6);
      
      // Quebrar texto da descrição se necessário
      const description = subItem.title;
      const lines = this.splitTextToFit(description, contentWidth - 35);
      for (const line of lines) {
        pdf.text(line, margin + 30, yPosition + 6);
        yPosition += 4;
      }
      yPosition += 4;
    }

    // Botões de avaliação
    yPosition += 5;
    const buttonWidth = 35;
    const buttonHeight = 6;
    const buttonSpacing = 5;
    let buttonX = margin;

    const evaluations = [
      { text: 'Conforme', color: [0, 128, 0] },
      { text: 'Inconforme', color: [255, 0, 0] },
      { text: 'Recomendação', color: [255, 165, 0] },
      { text: 'Não se aplica', color: [128, 128, 128] }
    ];

    for (const evaluation of evaluations) {
      pdf.setFillColor(evaluation.color[0], evaluation.color[1], evaluation.color[2]);
      pdf.rect(buttonX, yPosition, buttonWidth, buttonHeight, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'bold');
      pdf.text(evaluation.text, buttonX + buttonWidth / 2, yPosition + 4, { align: 'center' });
      buttonX += buttonWidth + buttonSpacing;
    }
    pdf.setTextColor(0, 0, 0);

    return yPosition + 15;
  }

  private static async addNonConformitySection(pdf: jsPDF, ncNumber: number, subItem: any, yPosition: number): Promise<number> {
    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = 20;

    // Verificar se precisa de nova página
    if (yPosition > 200) {
      pdf.addPage();
      yPosition = 20;
    }

    // Título NC
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`NC ${ncNumber}`, pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Situação atual
    if (subItem.currentSituation) {
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Situação Atual:', margin, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      const lines = this.splitTextToFit(subItem.currentSituation, pageWidth - (margin * 2) - 10);
      for (const line of lines) {
        pdf.text(line, margin + 5, yPosition);
        yPosition += 5;
      }
      yPosition += 3;
    }

    // Orientação
    if (subItem.clientGuidance) {
      pdf.setFont('helvetica', 'bold');
      pdf.text('Orientação:', margin, yPosition);
      yPosition += 6;
      pdf.setFont('helvetica', 'normal');
      const lines = this.splitTextToFit(subItem.clientGuidance, pageWidth - (margin * 2) - 10);
      for (const line of lines) {
        pdf.text(line, margin + 5, yPosition);
        yPosition += 5;
      }
      yPosition += 3;
    }

    // Foto (se disponível)
    if (subItem.photoData && subItem.photoData.url) {
      try {
        console.log('🖼️ Tentando adicionar foto ao PDF:', subItem.photoData.url);
        
        pdf.setFont('helvetica', 'bold');
        pdf.text('Foto:', margin, yPosition);
        yPosition += 6;

        // Verificar se precisa de nova página para a foto
        if (yPosition > 150) {
          pdf.addPage();
          yPosition = 20;
        }

        // Determinar o tipo de URL e carregar a imagem
        let imageUrl = subItem.photoData.url;
        
        // Se for base64, usar diretamente
        if (imageUrl.startsWith('data:image/')) {
          console.log('📸 Usando imagem base64');
          const imgData = imageUrl;
          
          // Criar uma imagem temporária para obter dimensões
          const img = new Image();
          await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
          });

          // Calcular dimensões da imagem para caber na página
          const maxWidth = pageWidth - (margin * 2) - 10;
          const maxHeight = 50;
          const imgAspectRatio = img.width / img.height;
          
          let imgWidth = maxWidth;
          let imgHeight = imgWidth / imgAspectRatio;
          
          if (imgHeight > maxHeight) {
            imgHeight = maxHeight;
            imgWidth = imgHeight * imgAspectRatio;
          }

          pdf.addImage(imgData, 'JPEG', margin + 5, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
          
        } else {
          // Se for URL do Firebase Storage, usar o SDK para evitar CORS
          console.log('🔥 Carregando imagem do Firebase Storage');
          
          try {
            // Extrair o caminho do arquivo da URL do Firebase Storage
            const url = new URL(imageUrl);
            console.log('🔍 URL completa:', imageUrl);
            console.log('🔍 Pathname:', url.pathname);
            
            // Regex melhorada para extrair o caminho do arquivo
            const pathMatch = url.pathname.match(/\/o\/(.+?)(?:\?|$)/);
            
            if (pathMatch) {
              const filePath = decodeURIComponent(pathMatch[1]);
              console.log('📁 Caminho do arquivo extraído:', filePath);
              
              // Obter URL de download usando o Firebase SDK
              const fileRef = ref(storage, filePath);
              const downloadURL = await getDownloadURL(fileRef);
              console.log('📥 URL de download:', downloadURL);
              
              // Carregar a imagem usando a URL de download
              const img = new Image();
              img.crossOrigin = 'anonymous';
              
              await new Promise((resolve, reject) => {
                img.onload = () => {
                  console.log('✅ Imagem carregada com sucesso:', img.width, 'x', img.height);
                  resolve(null);
                };
                img.onerror = (error) => {
                  console.error('❌ Erro ao carregar imagem:', error);
                  reject(error);
                };
                img.src = downloadURL;
              });

              const canvas = document.createElement('canvas');
              const ctx = canvas.getContext('2d')!;
              canvas.width = img.width;
              canvas.height = img.height;
              ctx.drawImage(img, 0, 0);

              const imgData = canvas.toDataURL('image/jpeg', 0.8);
              
              // Calcular dimensões da imagem para caber na página
              const maxWidth = pageWidth - (margin * 2) - 10;
              const maxHeight = 50;
              const imgAspectRatio = img.width / img.height;
              
              let imgWidth = maxWidth;
              let imgHeight = imgWidth / imgAspectRatio;
              
              if (imgHeight > maxHeight) {
                imgHeight = maxHeight;
                imgWidth = imgHeight * imgAspectRatio;
              }

              pdf.addImage(imgData, 'JPEG', margin + 5, yPosition, imgWidth, imgHeight);
              yPosition += imgHeight + 10;
              
            } else {
              throw new Error('Não foi possível extrair o caminho do arquivo da URL');
            }
            
          } catch (firebaseError) {
            console.error('❌ Erro ao carregar imagem do Firebase:', firebaseError);
            
            // Fallback: tentar carregar diretamente (pode falhar por CORS)
            console.log('🔄 Tentando carregamento direto como fallback...');
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            await new Promise((resolve, reject) => {
              img.onload = () => {
                console.log('✅ Imagem carregada com sucesso (fallback):', img.width, 'x', img.height);
                resolve(null);
              };
              img.onerror = (error) => {
                console.error('❌ Erro ao carregar imagem (fallback):', error);
                reject(error);
              };
              img.src = imageUrl;
            });

            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            const imgData = canvas.toDataURL('image/jpeg', 0.8);
            
            // Calcular dimensões da imagem para caber na página
            const maxWidth = pageWidth - (margin * 2) - 10;
            const maxHeight = 50;
            const imgAspectRatio = img.width / img.height;
            
            let imgWidth = maxWidth;
            let imgHeight = imgWidth / imgAspectRatio;
            
            if (imgHeight > maxHeight) {
              imgHeight = maxHeight;
              imgWidth = imgHeight * imgAspectRatio;
            }

            pdf.addImage(imgData, 'JPEG', margin + 5, yPosition, imgWidth, imgHeight);
            yPosition += imgHeight + 10;
          }
        }

        // Legenda da foto
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'italic');
        pdf.text(`Figura ${ncNumber} - ${subItem.title}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;

        console.log('✅ Foto adicionada ao PDF com sucesso');

      } catch (error) {
        console.error('❌ Erro ao adicionar imagem ao PDF:', error);
        console.error('URL da imagem:', subItem.photoData.url);
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.text('Erro ao carregar imagem', margin + 5, yPosition);
        yPosition += 8;
      }
    } else {
      console.log('⚠️ Nenhuma foto disponível para este item');
    }

    return yPosition;
  }

  private static getEvaluationText(evaluation: string): string {
    switch (evaluation) {
      case 'nc':
        return 'Não Conforme';
      case 'r':
        return 'Recomendação';
      case 'na':
        return 'Não se Aplica';
      default:
        return evaluation;
    }
  }

  private static splitTextToFit(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      // Estimativa aproximada - 1mm = ~0.3 caracteres para fonte 12pt
      const estimatedWidth = testLine.length * 0.3;
      
      if (estimatedWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }
} 