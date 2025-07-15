"use client";

import type React from "react";
import { useState, useEffect } from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import {
  Scale,
  TrendingUp,
  TrendingDown,
  Calendar,
  Target,
  Download,
  Bell,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import Auth from "@/components/ui/Auth";
import { useAuth } from "@/context/AuthContext";

interface HealthRecord {
  id: string;
  date: string;
  weight: number;
  height: number;
  bmi: number;
  classification: string;
}

export default function HealthMonitor() {
  const { user, setAuth } = useAuth();
  const [weight, setWeight] = useState("");
  const [height, setHeight] = useState("");
  const [weightGoal, setWeightGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("Error fetching session:", error);
        setLoading(false);
        return;
      }

      if (session) {
        setAuth(session.user);

        // Verificar se o perfil existe e criar se necessário
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (!profile && !profileError) {
          await supabase.from("profiles").upsert({
            id: session.user.id,
            email: session.user.email,
            full_name: session.user.user_metadata?.full_name || "",
          });
        }
      } else {
        setAuth(null);
      }

      setLoading(false);
    };

    fetchSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        setAuth(session.user);

        // Garantir que o perfil existe
        await supabase.from("profiles").upsert({
          id: session.user.id,
          email: session.user.email,
          full_name: session.user.user_metadata?.full_name || "",
        });
      } else {
        setAuth(null);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      const { data: records, error: recordsError } = await supabase
        .from("health_records")
        .select("*")
        .eq("user_id", user.id)
        .order("date", { ascending: false });

      if (recordsError) {
        console.error("Error fetching records:", recordsError);
        return;
      }

      if (records) setRecords(records);

      // Carregar meta
      const { data: goal, error: goalError } = await supabase
        .from("user_goals")
        .select("weight_goal")
        .eq("user_id", user.id)
        .single();

      if (goalError) {
        console.error("Error fetching goal:", goalError);
        return;
      }

      if (goal) setWeightGoal(goal.weight_goal.toString());
    };

    fetchData();
  }, [user]);

  //   const calculateBMI = (weight: number, height: number) => {
  //     const heightInMeters = height / 100;
  //     return weight / (heightInMeters * heightInMeters);
  //   };

  //   const getBMIClassification = (bmi: number) => {
  //     if (bmi < 18.5) return "Abaixo do peso";
  //     if (bmi < 25) return "Saudável";
  //     if (bmi < 30) return "Sobrepeso";
  //     return "Obesidade";
  //   };

  const getClassificationColor = (classification: string) => {
    switch (classification) {
      case "Saudável":
        return "bg-green-100 text-green-800";
      case "Sobrepeso":
        return "bg-yellow-100 text-yellow-800";
      case "Obesidade":
        return "bg-red-100 text-red-800";
      default:
        return "bg-blue-100 text-blue-800";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!weight || !height || !selectedDate || !user) return;

    setIsSubmitting(true); // Ativa o estado de loading

    try {
      const weightNum = Number.parseFloat(weight);
      const heightNum = Number.parseFloat(height);

      const { data: newRecord, error } = await supabase
        .from("health_records")
        .upsert({
          user_id: user.id,
          date: selectedDate,
          weight: weightNum,
          height: heightNum,
        })
        .select()
        .single();

      if (error) throw error;

      const updatedRecords = [
        newRecord,
        ...records.filter((r) => r.date !== newRecord.date),
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setRecords(updatedRecords);
      setWeight("");
      setHeight("");
      setSelectedDate(new Date().toISOString().split("T")[0]);
    } catch (error) {
      console.error("Error saving record:", error);
    } finally {
      setIsSubmitting(false); // Desativa o estado de loading
    }
  };

  const saveWeightGoal = async () => {
    if (!user) return;

    const { error } = await supabase
      .from("user_goals")
      .upsert({
        user_id: user.id,
        weight_goal: Number.parseFloat(weightGoal),
      })
      .select();

    if (error) {
      console.error("Error saving goal:", error);
      return;
    }

    setShowGoalInput(false);
  };

  const getWeightDifference = () => {
    if (records.length < 2) return null;
    const today = records[0];
    const yesterday = records[1];
    const diff = today.weight - yesterday.weight;
    return diff;
  };

  const getMonthlyBMIAverage = () => {
    const thisMonth = records.filter((r) => {
      const recordDate = new Date(r.date);
      const now = new Date();
      return (
        recordDate.getMonth() === now.getMonth() &&
        recordDate.getFullYear() === now.getFullYear()
      );
    });
    if (thisMonth.length === 0) return 0;
    return thisMonth.reduce((sum, r) => sum + r.bmi, 0) / thisMonth.length;
  };

  const exportToCSV = () => {
    const headers = [
      "Data",
      "Peso (kg)",
      "Altura (cm)",
      "IMC",
      "Classificação",
    ];
    const csvContent = [
      headers.join(","),
      ...records.map((r) =>
        [r.date, r.weight, r.height, r.bmi, r.classification].join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dados-saude.csv";
    a.click();
  };

  const chartData = records
    .slice(0, 30)
    .reverse()
    .map((r) => ({
      date: new Date(r.date).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      peso: r.weight,
      altura: r.height,
      imc: r.bmi,
    }));

  const weightDiff = getWeightDifference();
  const monthlyBMI = getMonthlyBMIAverage();

  if (loading)
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );

  return (
    <>
      <header className="bg-[#3498DB] text-white p-6 shadow-sm">
        <div className="max-w-6xl mx-auto">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Scale className="h-8 w-8" />
              <h1 className="text-2xl font-bold">Monitor de Saúde</h1>
            </div>
            <Auth />
          </div>
          <p className="text-blue-100 mt-2">
            Acompanhe seu peso, altura e IMC diariamente
          </p>
        </div>
      </header>
      {user ? (
        <div className="min-h-screen bg-white">
          <div className="max-w-6xl mx-auto p-6">
            <Tabs defaultValue="cadastro" className="space-y-6">
              <TabsList className="grid w-full grid-cols-3 bg-gray-100">
                <TabsTrigger
                  value="cadastro"
                  className="data-[state=active]:bg-white"
                >
                  Cadastro Diário
                </TabsTrigger>
                <TabsTrigger
                  value="dashboard"
                  className="data-[state=active]:bg-white"
                >
                  Dashboard
                </TabsTrigger>
                <TabsTrigger
                  value="historico"
                  className="data-[state=active]:bg-white"
                >
                  Histórico
                </TabsTrigger>
              </TabsList>

              {/* Cadastro Diário */}
              <TabsContent value="cadastro" className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="shadow-sm border-0 shadow-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[#2C3E50] flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {selectedDate === new Date().toISOString().split("T")[0]
                          ? "Registro de Hoje"
                          : "Registro Retroativo"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="date" className="text-[#2C3E50]">
                            Data do Registro
                          </Label>
                          <Input
                            id="date"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            className="border-gray-200 focus:border-[#3498DB]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="weight" className="text-[#2C3E50]">
                            Peso (kg)
                          </Label>
                          <Input
                            id="weight"
                            type="number"
                            step="0.1"
                            value={weight}
                            onChange={(e) => setWeight(e.target.value)}
                            placeholder="Ex: 70.5"
                            className="border-gray-200 focus:border-[#3498DB]"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="height" className="text-[#2C3E50]">
                            Altura (cm)
                          </Label>
                          <Input
                            id="height"
                            type="number"
                            value={height}
                            onChange={(e) => setHeight(e.target.value)}
                            placeholder="Ex: 175"
                            className="border-gray-200 focus:border-[#3498DB]"
                          />
                        </div>
                        {/* <Button
                          type="submit"
                          className="w-full bg-[#2ECC71] hover:bg-[#27AE60] text-white rounded-lg"
                        >
                          Salvar Registro
                        </Button> */}

                        <Button
                          type="submit"
                          className="w-full bg-[#2ECC71] hover:bg-[#27AE60] text-white rounded-lg cursor-pointer"
                          disabled={isSubmitting}
                        >
                          {isSubmitting ? (
                            <div className="flex items-center justify-center gap-2">
                              <svg
                                className="animate-spin h-5 w-5 text-white"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                              >
                                <circle
                                  className="opacity-25"
                                  cx="12"
                                  cy="12"
                                  r="10"
                                  stroke="currentColor"
                                  strokeWidth="4"
                                ></circle>
                                <path
                                  className="opacity-75"
                                  fill="currentColor"
                                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                ></path>
                              </svg>
                              Enviando...
                            </div>
                          ) : (
                            "Salvar Registro"
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>

                  {/* Resultado do Dia */}
                  {records.length > 0 && (
                    <Card className="shadow-sm border-0 shadow-gray-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-[#2C3E50]">
                          {records.length > 0 &&
                          records[0].date ===
                            new Date().toISOString().split("T")[0]
                            ? "Resultado de Hoje"
                            : `Último Registro (${new Date(
                                records[0].date
                              ).toLocaleDateString("pt-BR")})`}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="text-center">
                          <div className="text-3xl font-bold text-[#2C3E50] mb-2">
                            IMC: {records[0].bmi}
                          </div>
                          <Badge
                            className={`${getClassificationColor(
                              records[0].classification
                            )} text-sm px-3 py-1`}
                          >
                            {records[0].classification}
                          </Badge>
                        </div>

                        {weightDiff !== null && (
                          <div className="flex items-center justify-center gap-2 text-sm">
                            {weightDiff > 0 ? (
                              <TrendingUp className="h-4 w-4 text-red-500" />
                            ) : (
                              <TrendingDown className="h-4 w-4 text-green-500" />
                            )}
                            <span
                              className={
                                weightDiff > 0
                                  ? "text-red-600"
                                  : "text-green-600"
                              }
                            >
                              {weightDiff > 0 ? "+" : ""}
                              {weightDiff.toFixed(1)}kg desde ontem
                            </span>
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                          <div className="text-center">
                            <div className="text-lg font-semibold text-[#2C3E50]">
                              {records[0].weight}kg
                            </div>
                            <div className="text-sm text-gray-600">Peso</div>
                          </div>
                          <div className="text-center">
                            <div className="text-lg font-semibold text-[#2C3E50]">
                              {records[0].height}cm
                            </div>
                            <div className="text-sm text-gray-600">Altura</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Dashboard */}
              <TabsContent value="dashboard" className="space-y-6">
                <div className="grid md:grid-cols-3 gap-6">
                  <Card className="shadow-sm border-0 shadow-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[#2C3E50] flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        Meta de Peso
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {!showGoalInput ? (
                        <div className="space-y-3">
                          <div className="text-2xl font-bold text-[#2C3E50]">
                            {weightGoal ? `${weightGoal}kg` : "Não definida"}
                          </div>

                          {/* Progresso da Meta */}
                          {weightGoal && records.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">
                                  Atual: {records[0].weight}kg
                                </span>
                                <span className="text-gray-600">
                                  Meta: {weightGoal}kg
                                </span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-[#2ECC71] h-2 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      Math.max(
                                        0,
                                        100 -
                                          (Math.abs(
                                            records[0].weight -
                                              Number.parseFloat(weightGoal)
                                          ) /
                                            Number.parseFloat(weightGoal)) *
                                            100
                                      )
                                    )}%`,
                                  }}
                                />
                              </div>
                              <div className="text-center">
                                {records[0].weight >
                                Number.parseFloat(weightGoal) ? (
                                  <span className="text-orange-600 text-sm font-medium">
                                    -
                                    {(
                                      records[0].weight -
                                      Number.parseFloat(weightGoal)
                                    ).toFixed(1)}
                                    kg para a meta
                                  </span>
                                ) : records[0].weight <
                                  Number.parseFloat(weightGoal) ? (
                                  <span className="text-blue-600 text-sm font-medium">
                                    +
                                    {(
                                      Number.parseFloat(weightGoal) -
                                      records[0].weight
                                    ).toFixed(1)}
                                    kg para a meta
                                  </span>
                                ) : (
                                  <span className="text-green-600 text-sm font-medium">
                                    🎉 Meta alcançada!
                                  </span>
                                )}
                              </div>
                            </div>
                          )}

                          <Button
                            onClick={() => setShowGoalInput(true)}
                            variant="outline"
                            className="w-full border-[#3498DB] text-[#3498DB] hover:bg-[#3498DB] hover:text-white"
                          >
                            {weightGoal ? "Alterar Meta" : "Definir Meta"}
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <Input
                            type="number"
                            step="0.1"
                            value={weightGoal}
                            onChange={(e) => setWeightGoal(e.target.value)}
                            placeholder="Ex: 70.0"
                            className="border-gray-200 focus:border-[#3498DB]"
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={saveWeightGoal}
                              className="flex-1 bg-[#2ECC71] hover:bg-[#27AE60] text-white"
                            >
                              Salvar
                            </Button>
                            <Button
                              onClick={() => setShowGoalInput(false)}
                              variant="outline"
                              className="flex-1"
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-0 shadow-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[#2C3E50]">
                        IMC Médio Mensal
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#2C3E50] mb-2">
                        {monthlyBMI.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Baseado em{" "}
                        {
                          records.filter((r) => {
                            const recordDate = new Date(r.date);
                            const now = new Date();
                            return recordDate.getMonth() === now.getMonth();
                          }).length
                        }{" "}
                        registros
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-0 shadow-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[#2C3E50]">
                        Total de Registros
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-[#2C3E50] mb-2">
                        {records.length}
                      </div>
                      <div className="text-sm text-gray-600">
                        Dias monitorados
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="shadow-sm border-0 shadow-gray-200">
                    <CardHeader className="pb-4">
                      <CardTitle className="text-[#2C3E50]">
                        Variação de Altura
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {records.length > 0 && (
                          <>
                            <div className="text-2xl font-bold text-[#2C3E50] mb-2">
                              {records[0].height}cm
                            </div>
                            <div className="text-sm text-gray-600">
                              Altura atual
                            </div>
                            {records.length > 1 && (
                              <div className="flex items-center gap-2 text-sm">
                                {records[0].height > records[1].height ? (
                                  <TrendingUp className="h-4 w-4 text-blue-500" />
                                ) : records[0].height < records[1].height ? (
                                  <TrendingDown className="h-4 w-4 text-purple-500" />
                                ) : (
                                  <span className="h-4 w-4" />
                                )}
                                <span
                                  className={
                                    records[0].height !== records[1].height
                                      ? "text-blue-600"
                                      : "text-gray-600"
                                  }
                                >
                                  {records[0].height !== records[1].height
                                    ? `${
                                        records[0].height > records[1].height
                                          ? "+"
                                          : ""
                                      }${(
                                        records[0].height - records[1].height
                                      ).toFixed(1)}cm desde ontem`
                                    : "Sem alteração"}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Ações Rápidas */}
                <Card className="shadow-sm border-0 shadow-gray-200">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-[#2C3E50]">
                      Ações Rápidas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        onClick={exportToCSV}
                        variant="outline"
                        className="border-[#3498DB] text-[#3498DB] hover:bg-[#3498DB] hover:text-white bg-transparent"
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Exportar CSV
                      </Button>
                      <Button
                        variant="outline"
                        className="border-[#2ECC71] text-[#2ECC71] hover:bg-[#2ECC71] hover:text-white bg-transparent"
                      >
                        <Bell className="h-4 w-4 mr-2" />
                        Configurar Lembretes
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Histórico */}
              <TabsContent value="historico" className="space-y-6">
                {records.length > 0 ? (
                  <>
                    <div className="grid md:grid-cols-3 gap-6">
                      <Card className="shadow-sm border-0 shadow-gray-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-[#2C3E50]">
                            Evolução do Peso
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart data={chartData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                              />
                              <XAxis dataKey="date" stroke="#666" />
                              <YAxis stroke="#666" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: "8px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="peso"
                                stroke="#2ECC71"
                                strokeWidth={3}
                                dot={{ fill: "#2ECC71", strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-0 shadow-gray-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-[#2C3E50]">
                            Evolução da Altura
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <LineChart
                              data={chartData.map((d) => ({
                                ...d,
                                altura:
                                  d.altura ||
                                  chartData.find((c) => c.date === d.date)
                                    ?.altura ||
                                  records.find(
                                    (r) =>
                                      new Date(r.date).toLocaleDateString(
                                        "pt-BR",
                                        {
                                          day: "2-digit",
                                          month: "2-digit",
                                        }
                                      ) === d.date
                                  )?.height,
                              }))}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                              />
                              <XAxis dataKey="date" stroke="#666" />
                              <YAxis stroke="#666" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: "8px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="altura"
                                stroke="#9B59B6"
                                strokeWidth={3}
                                dot={{ fill: "#9B59B6", strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>

                      <Card className="shadow-sm border-0 shadow-gray-200">
                        <CardHeader className="pb-4">
                          <CardTitle className="text-[#2C3E50]">
                            Evolução do IMC
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <ResponsiveContainer width="100%" height={250}>
                            <BarChart data={chartData}>
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#f0f0f0"
                              />
                              <XAxis dataKey="date" stroke="#666" />
                              <YAxis stroke="#666" />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "white",
                                  border: "1px solid #e0e0e0",
                                  borderRadius: "8px",
                                }}
                              />
                              <Bar
                                dataKey="imc"
                                fill="#3498DB"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </div>

                    <Card className="shadow-sm border-0 shadow-gray-200">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-[#2C3E50]">
                          Histórico Detalhado
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 max-h-96 overflow-y-auto">
                          {records.map((record) => (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                            >
                              <div className="flex items-center gap-4">
                                <div className="text-sm font-medium text-[#2C3E50]">
                                  {new Date(record.date).toLocaleDateString(
                                    "pt-BR"
                                  )}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {record.weight}kg • {record.height}cm
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-sm font-medium text-[#2C3E50]">
                                  IMC: {record.bmi}
                                </div>
                                <Badge
                                  className={`${getClassificationColor(
                                    record.classification
                                  )} text-xs`}
                                >
                                  {record.classification}
                                </Badge>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                ) : (
                  <Card className="shadow-sm border-0 shadow-gray-200">
                    <CardContent className="text-center py-12">
                      <Scale className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-[#2C3E50] mb-2">
                        Nenhum registro encontrado
                      </h3>
                      <p className="text-gray-600">
                        Comece adicionando seu primeiro registro na aba
                        &rdquo;Cadastro Diário&rdquo;
                      </p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      ) : (
        <div className="max-w-6xl mx-auto p-6 text-center py-12">
          <h2 className="text-xl font-medium mb-4">
            Por favor, faça login para acessar o Monitor de Saúde
          </h2>
        </div>
      )}
    </>
  );
}
