const { createApp, ref, computed, watch } = Vue;

const STORAGE_KEY = 'qa_core_studio_plans_v1';

createApp({
  setup() {
    const currentTab = ref('plans');
    const activePlanId = ref(null);
    const showIsoModal = ref(false);
    const showSettingsModal = ref(false);
    const filterText = ref('');
    const filterStatus = ref('');

    const ambiguousWords = ['正常', '正しく', '適切', '問題なく', '速やかに', '適当', 'エラーが起きない'];

    // デフォルトのサンプルデータ
    const defaultPlans = [
      {
        id: 'plan-1',
        docId: 'TP-2026-SYS01-001',
        projectName: '次世代EC決済基盤システム開発',
        version: 'v1.0.0',
        createdAt: '2026-09-28',
        testLevel: 'システムテスト (ST)',
        testType: '機能テスト',
        author: 'QA Lead 山田太郎',
        inScope: '1. 決済ゲートウェイAPI連携\n2. ユーザー認証・チェックアウトフロー',
        outOfScope: '1. 外部在庫連携バッチ（外部保守期間外）\n2. レガシーブラウザ検証',
        entryCriteria: '・UT通過率100%\n・ST環境へ最新安定ビルド適用済み',
        exitCriteria: '・テスト計画消化率100%\n・Blocker欠陥0件\n・Pass率98%以上',
        testEnvironment: '・STテスト環境 (AWS Staging VPC)\n・モックサーバー: WireMock',
        riskStrategy: '・環境障害: スタブ環境への即時切り替え\n・仕様変更: CCBによるトリアージ実施',
        testCases: [
          {
            id: 1, caseId: 'TC_ST_AUTH_001', category: 'アカウント認証', technique: '境界値分析',
            objective: '連続認証失敗時のアカウントロック機能の正常作動確認', precondition: 'ロックカウント0',
            steps: '1. 誤パスワードを5回連続入力', testData: 'ID: test_01', expected: 'アカウント凍結メッセージが表示されること',
            criteria: 'HTTP 423の返却', status: 'Pass', evidence: 'JIRA-4092', hasAmbiguousWord: false
          },
          {
            id: 2, caseId: 'TC_ST_PAY_002', category: '決済フロー', technique: 'デシジョンテーブル',
            objective: 'プレミアム会員かつクーポン適用時の割引額検証', precondition: 'プレミアム会員ログイン済',
            steps: '1. 商品追加 2. 10%OFFクーポン適用', testData: 'Coupon: CP10', expected: '最終請求額が正しく7,650円と表示されること',
            criteria: '金額一致', status: 'Fail', evidence: 'BUG-102', hasAmbiguousWord: true
          }
        ],
        defects: [
          { id: 1, ticketId: 'BUG-102', title: 'クーポン適用時の割引額計算エラー', severity: 'Critical', priority: 'High', status: 'Assigned' }
        ]
      }
    ];

    // LocalStorageからの読み込み（無ければデフォルト値をロード）
    const loadPlans = () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load saved plans from LocalStorage', e);
        }
      }
      return defaultPlans;
    };

    const plans = ref(loadPlans());

    // plans配列の変更を監視し、自動でLocalStorageへ保存 (Deep Watch)
    watch(
      plans,
      (newPlans) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newPlans));
      },
      { deep: true }
    );

    const activePlan = computed(() => plans.value.find(p => p.id === activePlanId.value) || null);

    const openPlan = (planId, tab = 'dashboard') => {
      activePlanId.value = planId;
      currentTab.value = tab;
    };

    const closePlan = () => {
      activePlanId.value = null;
      currentTab.value = 'plans';
    };

    const createNewPlan = () => {
      const newId = `plan-${Date.now()}`;
      const count = plans.value.length + 1;
      plans.value.push({
        id: newId,
        docId: `TP-${new Date().getFullYear()}-PROJ-${String(count).padStart(3, '0')}`,
        projectName: `新規プロジェクト ${count}`,
        version: 'v1.0.0',
        createdAt: new Date().toISOString().split('T')[0],
        testLevel: 'システムテスト (ST)',
        testType: '機能テスト',
        author: '', inScope: '', outOfScope: '', entryCriteria: '', exitCriteria: '', testEnvironment: '', riskStrategy: '',
        testCases: [], defects: []
      });
      openPlan(newId, 'plan');
    };

    const deletePlan = (id) => {
      if(confirm('このテスト計画を削除してもよろしいですか？')) {
        plans.value = plans.value.filter(p => p.id !== id);
      }
    };

    // 全データ初期化（LocalStorageのキャッシュも削除）
    const resetAllData = () => {
      if(confirm('警告: 全てのテスト計画データが完全に削除されます。初期状態に戻しますか？')) {
        localStorage.removeItem(STORAGE_KEY);
        plans.value = JSON.parse(JSON.stringify(defaultPlans));
        closePlan();
        showSettingsModal.value = false;
      }
    };

    const checkAmbiguity = (tc) => {
      tc.hasAmbiguousWord = ambiguousWords.some(word => tc.expected.includes(word));
    };

    const addTestCase = () => {
      if(!activePlan.value) return;
      const nextNum = activePlan.value.testCases.length + 1;
      activePlan.value.testCases.push({
        id: Date.now(), caseId: `TC_ST_${String(nextNum).padStart(3, '0')}`, category: '新規',
        technique: '', objective: '', precondition: '', steps: '', testData: '', expected: '', criteria: '',
        status: 'Untested', evidence: '', hasAmbiguousWord: false
      });
    };

    const duplicateTestCase = (index) => {
      if(!activePlan.value) return;
      const cloned = JSON.parse(JSON.stringify(filteredTestCases.value[index]));
      cloned.id = Date.now();
      cloned.caseId = `${cloned.caseId}_COPY`;
      activePlan.value.testCases.push(cloned);
    };

    const removeTestCase = (id) => {
      if(!activePlan.value) return;
      activePlan.value.testCases = activePlan.value.testCases.filter(tc => tc.id !== id);
    };

    const addDefect = () => {
      if(!activePlan.value) return;
      activePlan.value.defects.push({
        id: Date.now(), ticketId: `BUG-${activePlan.value.defects.length + 101}`, title: '新規報告バグ',
        severity: 'Major', priority: 'Medium', status: 'New'
      });
    };

    const addTemplate = (type) => {
      if(!activePlan.value) return;
      const id = Date.now();
      const next = String(activePlan.value.testCases.length + 1).padStart(3, '0');
      if (type === 'boundary') {
        activePlan.value.testCases.push({ id, caseId: `TC_BVA_${next}`, category: '境界値', technique: '境界値分析', objective: '文字数制限の境界評価', precondition: '', steps: '256文字送信', testData: '', expected: 'HTTP 200が返ること', criteria: '', status: 'Untested', evidence: '', hasAmbiguousWord: false });
      } else if (type === 'decision') {
        activePlan.value.testCases.push({ id, caseId: `TC_DEC_${next}`, category: '条件', technique: 'デシジョンテーブル', objective: '複数属性の権限判定検証', precondition: '', steps: '', testData: '', expected: '', criteria: '', status: 'Untested', evidence: '', hasAmbiguousWord: false });
      } else if (type === 'state') {
        activePlan.value.testCases.push({ id, caseId: `TC_STM_${next}`, category: '状態', technique: '状態遷移', objective: '不正な状態遷移イベントの遮断', precondition: '', steps: '', testData: '', expected: '', criteria: '', status: 'Untested', evidence: '', hasAmbiguousWord: false });
      }
    };

    const filteredTestCases = computed(() => {
      if(!activePlan.value) return [];
      return activePlan.value.testCases.filter(tc => {
        const matchesText = !filterText.value || tc.caseId.toLowerCase().includes(filterText.value.toLowerCase()) || tc.category.toLowerCase().includes(filterText.value.toLowerCase()) || tc.objective.toLowerCase().includes(filterText.value.toLowerCase());
        const matchesStatus = !filterStatus.value || tc.status === filterStatus.value;
        return matchesText && matchesStatus;
      });
    });

    const statusBadgeStyle = (status) => {
      switch (status) {
        case 'Pass': return 'bg-emerald-950/80 text-emerald-400 border-emerald-700/80';
        case 'Fail': return 'bg-rose-950/80 text-rose-400 border-rose-700/80';
        case 'Blocked': return 'bg-amber-950/80 text-amber-400 border-amber-700/80';
        case 'Skipped': return 'bg-slate-800 text-slate-400 border-slate-700';
        default: return 'bg-slate-900 text-slate-300 border-slate-700';
      }
    };

    const metrics = computed(() => {
      if(!activePlan.value) return { total:0, executed:0, passCount:0, failCount:0, blockedCount:0, skippedCount:0, untestedCount:0, progressRate:0, passRate:0, dre:0 };
      const tcs = activePlan.value.testCases;
      const total = tcs.length;
      const passCount = tcs.filter(tc => tc.status === 'Pass').length;
      const failCount = tcs.filter(tc => tc.status === 'Fail').length;
      const blockedCount = tcs.filter(tc => tc.status === 'Blocked').length;
      const skippedCount = tcs.filter(tc => tc.status === 'Skipped').length;
      const untestedCount = tcs.filter(tc => tc.status === 'Untested').length;

      const executed = total - untestedCount;
      const progressRate = total > 0 ? ((executed / total) * 100).toFixed(1) : '0.0';
      const passRate = executed > 0 ? ((passCount / executed) * 100).toFixed(1) : '0.0';
      const internalDefects = activePlan.value.defects.length;
      const dre = internalDefects > 0 ? '100.0' : '100.0';

      return { total, executed, passCount, failCount, blockedCount, skippedCount, untestedCount, progressRate, passRate, dre };
    });

    const exportActivePlanJSON = () => {
      if(!activePlan.value) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(activePlan.value, null, 2));
      const dl = document.createElement('a');
      dl.setAttribute("href", dataStr);
      dl.setAttribute("download", `${activePlan.value.docId}_PlanPackage.json`);
      document.body.appendChild(dl);
      dl.click();
      dl.remove();
    };

    const importPlanJSON = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (parsed.docId && parsed.projectName) {
            parsed.id = `plan-${Date.now()}`; 
            if(!parsed.testCases) parsed.testCases = [];
            if(!parsed.defects) parsed.defects = [];
            plans.value.push(parsed);
            openPlan(parsed.id, 'dashboard');
          } else {
            alert('無効なテスト計画ファイルです。');
          }
        } catch (err) { alert('読込エラー'); }
      };
      reader.readAsText(file);
    };

    const exportCSV = () => {
      if(!activePlan.value) return;
      const headers = ['ケースID', 'カテゴリ', '技法', 'テスト目的', '事前条件', '操作手順', 'テストデータ', '期待結果', '判定基準', 'ステータス', 'エビデンス'];
      const rows = activePlan.value.testCases.map(tc => [
        `"${tc.caseId}"`, `"${tc.category}"`, `"${tc.technique}"`, `"${tc.objective.replace(/"/g, '""')}"`,
        `"${tc.precondition.replace(/"/g, '""')}"`, `"${tc.steps.replace(/"/g, '""')}"`, `"${tc.testData.replace(/"/g, '""')}"`,
        `"${tc.expected.replace(/"/g, '""')}"`, `"${tc.criteria.replace(/"/g, '""')}"`, `"${tc.status}"`, `"${tc.evidence}"`
      ]);
      const csvContent = "\uFEFF" + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.setAttribute('download', `${activePlan.value.docId}_TestCases.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    return {
      currentTab, activePlanId, plans, activePlan, openPlan, closePlan, createNewPlan, deletePlan, resetAllData,
      showIsoModal, showSettingsModal, filterText, filterStatus, filteredTestCases, metrics, statusBadgeStyle,
      addTestCase, duplicateTestCase, removeTestCase, addDefect, addTemplate, checkAmbiguity,
      exportActivePlanJSON, importPlanJSON, exportCSV
    };
  }
}).mount('#app');