import { Injectable, Logger } from '@nestjs/common';
import { StartFirebaseRunDto } from '../apk-uploads/dto/apk.dto';

const DEVICE_CATALOG = [
  { model: 'Pixel 6', apiLevel: '33', manufacturer: 'Google', os: 'Android 13', form: 'PHONE' },
  { model: 'Pixel 7 Pro', apiLevel: '33', manufacturer: 'Google', os: 'Android 13', form: 'PHONE' },
  { model: 'Samsung Galaxy S22', apiLevel: '32', manufacturer: 'Samsung', os: 'Android 12', form: 'PHONE' },
  { model: 'Samsung Galaxy Tab S8', apiLevel: '32', manufacturer: 'Samsung', os: 'Android 12', form: 'TABLET' },
  { model: 'OnePlus 10 Pro', apiLevel: '32', manufacturer: 'OnePlus', os: 'Android 12', form: 'PHONE' },
  { model: 'Xiaomi 12', apiLevel: '31', manufacturer: 'Xiaomi', os: 'Android 11', form: 'PHONE' },
  { model: 'Moto G Power (2022)', apiLevel: '29', manufacturer: 'Motorola', os: 'Android 9', form: 'PHONE' },
  { model: 'Pixel 4a', apiLevel: '30', manufacturer: 'Google', os: 'Android 10', form: 'PHONE' },
];

@Injectable()
export class FirebaseTestlabService {
  private readonly logger = new Logger(FirebaseTestlabService.name);
  private readonly useMock = process.env.FIREBASE_USE_MOCK !== 'false';

  getDefaultDevices() {
    return DEVICE_CATALOG.slice(0, 4);
  }

  async runTests(filePath: string, fileName: string, runId: string, dto: StartFirebaseRunDto) {
    if (this.useMock) {
      return this.generateMockResults(fileName, runId, dto);
    }
    return this.runRealTests(filePath, fileName, runId, dto);
  }

  private async runRealTests(filePath: string, fileName: string, runId: string, dto: StartFirebaseRunDto) {
    // Real Firebase Test Lab integration would go here
    // For now fallback to mock
    this.logger.warn('Firebase real integration not configured, using mock');
    return this.generateMockResults(fileName, runId, dto);
  }

  private async generateMockResults(fileName: string, runId: string, dto: StartFirebaseRunDto) {
    // Simulate test duration 10-30 seconds
    await new Promise((r) => setTimeout(r, 10000 + Math.random() * 20000));

    const devices = (dto.devices as any[]) || this.getDefaultDevices();
    const testMatrixId = `projects/mobile-testing-demo/testMatrices/mock_${runId}_${Date.now()}`;
    const testType = dto.testType || 'robo';

    const deviceResults = devices.map((device) => {
      const rand = Math.random();
      const passed = rand > 0.15;
      const status = passed ? 'passed' : rand > 0.07 ? 'failed' : 'error';

      const screenshots = passed ? this.generateScreenshots(device.model) : [];
      const logs = this.generateLogs(device.model, status);

      return {
        device: device.model || device.modelId,
        apiLevel: device.apiLevel || device.version,
        manufacturer: device.manufacturer || 'Unknown',
        os: device.os || `Android ${device.apiLevel}`,
        form: device.form || 'PHONE',
        status,
        duration: Math.floor(Math.random() * 120) + 30, // seconds
        testCases: testType === 'robo' ? null : this.generateTestCases(status),
        crashDetails: !passed && rand <= 0.07 ? this.generateCrashDetails() : null,
        screenshots,
        logs,
        startTime: new Date(Date.now() - 120000).toISOString(),
        endTime: new Date().toISOString(),
      };
    });

    const passed = deviceResults.filter((r) => r.status === 'passed').length;
    const failed = deviceResults.filter((r) => r.status === 'failed').length;
    const errors = deviceResults.filter((r) => r.status === 'error').length;

    return {
      testMatrixId,
      passed,
      failed,
      errors,
      results: {
        testMatrixId,
        testType,
        state: 'FINISHED',
        timestamp: new Date().toISOString(),
        deviceResults,
        summary: {
          total: devices.length,
          passed,
          failed,
          errors,
          successRate: parseFloat(((passed / devices.length) * 100).toFixed(1)),
        },
        roboDirective: testType === 'robo' ? { resourceName: 'com.example.MainActivity', inputText: '' } : null,
        resultsStorage: `gs://mobile-testing-demo.appspot.com/results/${runId}`,
        clientInfo: { name: 'MobileTestingPlatform', clientInfoDetails: [] },
      },
    };
  }

  private generateTestCases(status: string) {
    const cases = [
      { name: 'testLaunchActivity', class: 'com.example.MainActivityTest' },
      { name: 'testLoginFlow', class: 'com.example.AuthTest' },
      { name: 'testNavigationDrawer', class: 'com.example.NavigationTest' },
      { name: 'testDataLoading', class: 'com.example.DataTest' },
      { name: 'testFormValidation', class: 'com.example.FormTest' },
      { name: 'testSearchFunctionality', class: 'com.example.SearchTest' },
    ];

    return cases.map((tc, i) => ({
      ...tc,
      status: status === 'passed' ? 'passed' : i === cases.length - 1 ? 'failed' : 'passed',
      durationMs: Math.floor(Math.random() * 5000) + 500,
    }));
  }

  private generateCrashDetails() {
    const crashes = [
      { type: 'NullPointerException', message: 'Attempt to invoke virtual method on a null object reference', stackTrace: 'at com.example.MainActivity.onCreate(MainActivity.java:42)' },
      { type: 'OutOfMemoryError', message: 'Failed to allocate 32MB', stackTrace: 'at android.graphics.BitmapFactory.decodeStream(BitmapFactory.java:609)' },
      { type: 'NetworkOnMainThreadException', message: 'Cannot perform network operation on main thread', stackTrace: 'at com.example.api.ApiClient.fetchData(ApiClient.java:87)' },
    ];
    return crashes[Math.floor(Math.random() * crashes.length)];
  }

  private generateScreenshots(model: string) {
    return Array.from({ length: Math.floor(Math.random() * 4) + 2 }, (_, i) => ({
      name: `screenshot_${i + 1}.png`,
      url: `https://storage.googleapis.com/mock-bucket/screenshots/${model.replace(/\s/g, '_')}_${i + 1}.png`,
      step: `Step ${i + 1}`,
    }));
  }

  private generateLogs(model: string, status: string) {
    const lines = [
      `[INFO] Starting Robo test on ${model}`,
      '[INFO] App launched successfully',
      '[INFO] Crawling UI elements...',
      '[DEBUG] Found 12 clickable elements',
      '[INFO] Tapping: Login Button',
      '[INFO] Tapping: Menu Icon',
      status === 'error' ? '[ERROR] ANR detected after 5000ms' :
        status === 'failed' ? '[WARN] Crash detected: NullPointerException' :
          '[INFO] Robo test completed successfully',
    ];
    return lines.join('\n');
  }
}
