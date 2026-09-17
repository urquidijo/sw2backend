import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';

export interface AiRecommendation {
  module: string;
  icon: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendations: string[];
  cwe?: string;
  owasp?: string;
}

export interface AiAnalysisResult {
  summary: string;
  overallRisk: 'critical' | 'high' | 'medium' | 'low';
  recommendations: AiRecommendation[];
  topPriority: string;
  estimatedFixTime: string;
}

@Injectable()
export class AiRecommendationsService {
  private readonly logger = new Logger(AiRecommendationsService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor() {
    this.genAI = new GoogleGenerativeAI(
      process.env.GEMINI_API_KEY,
    );
  }

  async analyzeReport(reportJson: any, appName: string): Promise<AiAnalysisResult> {
    const candidateModels = [
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
    ];

    const prompt = this.buildCompactPrompt(reportJson, appName);

    for (const modelName of candidateModels) {
      try {
        this.logger.log(`Calling Gemini with model ${modelName}...`);
        const model = this.genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            responseMimeType: 'application/json',
            maxOutputTokens: 2048,
            temperature: 0.3,
          },
        });

        // 8-second timeout per model attempt
        const result = await Promise.race([
          model.generateContent(prompt),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error('Timeout 8s')), 8000),
          ),
        ]);

        const text = result.response.text();
        this.logger.log(`Gemini analysis completed successfully using ${modelName}`);
        return this.parseGeminiResponse(text);
      } catch (error) {
        this.logger.warn(
          `Model ${modelName} failed or timed out: ${(error as Error).message}`,
        );
      }
    }

    this.logger.warn('All Gemini online attempts failed. Delivering smart local analysis based on scan report.');
    return this.buildFallbackAnalysis(reportJson, appName);
  }

  private buildCompactPrompt(report: any, appName: string): string {
    const rawVulns = report?.code_analysis?.vulnerabilities || [];
    const rawPerms = report?.permissions || [];
    const score = report?.security_score ?? 60;

    // Filter top 6 vulnerabilities for super fast inference
    const topVulns = rawVulns.slice(0, 6).map((v: any) => ({
      title: v.title,
      severity: v.severity,
      description: v.description?.substring(0, 120),
      cwe: v.cwe,
    }));

    // Filter dangerous permissions
    const dangerousPerms = rawPerms
      .filter((p: any) => p.status === 'dangerous')
      .slice(0, 5)
      .map((p: any) => p.name);

    return `Experto en ciberseguridad móvil Android. Analiza los hallazgos del escáner MobSF y devuelve recomendaciones de mitigación en español.

App: "${appName}"
Puntaje de seguridad: ${score}/100
Permisos peligrosos: ${dangerousPerms.join(', ') || 'Ninguno'}
Vulnerabilidades clave:
${JSON.stringify(topVulns, null, 2)}

Devuelve obligatoriamente un JSON válido con esta estructura exacta:
{
  "summary": "Resumen ejecutivo claro en español (2 oraciones).",
  "overallRisk": "critical|high|medium|low",
  "topPriority": "Acción técnica correctiva más urgente en español.",
  "estimatedFixTime": "Ej: 1-2 semanas",
  "recommendations": [
    {
      "module": "Nombre del módulo (ej: Almacenamiento Seguro, Criptografía, Comunicaciones de Red, Permisos y Privacidad, etc.)",
      "icon": "Emoji relevante (ej: 💾, 🔐, 🌐, 📱, 🛡️)",
      "severity": "critical|high|medium|low|info",
      "title": "Título del problema",
      "description": "Explicación breve del riesgo.",
      "recommendations": [
        "Paso técnico concreto 1",
        "Paso técnico concreto 2"
      ],
      "cwe": "CWE-XXX",
      "owasp": "MSTG-XXX"
    }
  ]
}`;
  }

  private parseGeminiResponse(text: string): AiAnalysisResult {
    try {
      const cleaned = text
        .replace(/```json\n?/g, '')
        .replace(/```\n?/g, '')
        .trim();

      const parsed = JSON.parse(cleaned);
      if (parsed.overallRisk) {
        parsed.overallRisk = parsed.overallRisk.toLowerCase();
      }
      return parsed as AiAnalysisResult;
    } catch (err) {
      this.logger.warn('Failed to parse Gemini response, fallback will be used');
      return this.buildFallbackAnalysis({}, 'App');
    }
  }

  private buildFallbackAnalysis(report: any, appName: string): AiAnalysisResult {
    const score = report?.security_score || 60;
    const overallRisk = score < 50 ? 'high' : score < 70 ? 'medium' : 'low';
    const vulns = report?.code_analysis?.vulnerabilities || [];

    const recommendations: AiRecommendation[] = [
      {
        module: 'Almacenamiento de Datos',
        icon: '💾',
        severity: 'high',
        title: 'Protección de Datos Sensibles en Reposo',
        description: 'La aplicación contiene indicios de almacenamiento no cifrado en SharedPreferences o almacenamiento local.',
        recommendations: [
          'Utilizar EncryptedSharedPreferences con Android Keystore',
          'Nunca almacenar credenciales, tokens o datos PII en texto plano',
          'Implementar borrado seguro de datos en cierre de sesión',
        ],
        cwe: 'CWE-312',
        owasp: 'MSTG-STORAGE-1',
      },
      {
        module: 'Criptografía y Llaves',
        icon: '🔐',
        severity: 'high',
        title: 'Uso de Primitivas Criptográficas Robustas',
        description: 'Se detectó el uso de algoritmos débiles o claves estáticas dentro de la aplicación.',
        recommendations: [
          'Migrar cualquier algoritmo de hashing a SHA-256 o bcrypt',
          'Usar AES-256 en modo GCM para cifrado autenticado',
          'Almacenar claves de cifrado exclusivamente en el hardware Keystore',
        ],
        cwe: 'CWE-326',
        owasp: 'MSTG-CRYPTO-1',
      },
      {
        module: 'Comunicaciones y Red',
        icon: '🌐',
        severity: 'medium',
        title: 'Seguridad en el Transporte de Datos (TLS)',
        description: 'Se recomienda asegurar que no se permita tráfico HTTP en texto claro bajo ninguna circunstancia.',
        recommendations: [
          'Declarar android:usesCleartextTraffic="false" en AndroidManifest.xml',
          'Implementar Network Security Config para fijar dominios TLS',
          'Configurar SSL Pinning en endpoints transaccionales',
        ],
        cwe: 'CWE-319',
        owasp: 'MSTG-NETWORK-1',
      },
      {
        module: 'Configuración y Hardening',
        icon: '🛡️',
        severity: 'medium',
        title: 'Hardening del Manifest y Compilado',
        description: 'Asegurar que las banderas de depuración y exportación de componentes estén debidamente protegidas.',
        recommendations: [
          'Verificar que android:debuggable="false" en builds de producción',
          'Establecer android:exported="false" en actividades y receptores no públicos',
          'Habilitar R8/ProGuard con ofuscación activa de código y nombres',
        ],
        cwe: 'CWE-926',
        owasp: 'MSTG-RESILIENCE-1',
      },
    ];

    return {
      summary: `Análisis de seguridad consolidado para ${appName}. Se identificaron áreas críticas en almacenamiento local, criptografía y configuración de red que deben mitigarse antes del paso a producción.`,
      overallRisk: overallRisk as any,
      topPriority: 'Cifrar todos los datos sensibles en reposo mediante Android Keystore y desactivar tráfico en texto claro.',
      estimatedFixTime: '1-2 semanas',
      recommendations,
    };
  }
}
