"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { Moon, Flower, DollarSign, Clock, CalendarIcon, BookOpen, Heart, Lightbulb, BarChart3 } from "lucide-react"

export default function BusinessPlanner() {
  // State for revenue tracking
  const [revenue, setRevenue] = useState<
    {
      date: string
      source: string
      product: string
      platform: string
      amount: number
      category: string
      notes: string
    }[]
  >([
    {
      date: "2025-04-01",
      source: "Client Project",
      product: "Website Design",
      platform: "Upwork",
      amount: 750,
      category: "Services",
      notes: "Homepage redesign for local business",
    },
    {
      date: "2025-04-02",
      source: "Digital Product",
      product: "Brand Identity Workbook",
      platform: "Shopify",
      amount: 87,
      category: "Digital Products",
      notes: "3 sales @ $29 each",
    },
  ])

  // State for product pipeline
  const [products, setProducts] = useState<
    {
      name: string
      type: string
      stage: string
      launchDate: string
      price: number
      potential: string
      notes: string
      completed: boolean
    }[]
  >([
    {
      name: "Digital Entrepreneur's Starter Kit",
      type: "Digital",
      stage: "Launched",
      launchDate: "2025-03-15",
      price: 37,
      potential: "High",
      notes: "Selling well, consider bundle options",
      completed: true,
    },
    {
      name: "Automation Workflow Templates",
      type: "Digital",
      stage: "In Progress",
      launchDate: "2025-05-01",
      price: 49,
      potential: "High",
      notes: "Need to finalize 2 more templates",
      completed: false,
    },
    {
      name: "Southern Gothic Art Prints",
      type: "Physical",
      stage: "Idea",
      launchDate: "2025-07-01",
      price: 45,
      potential: "Medium",
      notes: "Research print-on-demand options",
      completed: false,
    },
  ])

  // State for expenses
  const [expenses, setExpenses] = useState<
    {
      date: string
      vendor: string
      purpose: string
      category: string
      amount: number
      paid: boolean
      notes: string
    }[]
  >([
    {
      date: "2025-04-01",
      vendor: "Adobe",
      purpose: "Creative Cloud Subscription",
      category: "Software",
      amount: 52.99,
      paid: true,
      notes: "Monthly subscription",
    },
    {
      date: "2025-04-05",
      vendor: "Shopify",
      purpose: "E-commerce Platform",
      category: "Website",
      amount: 29.99,
      paid: false,
      notes: "Due on the 10th",
    },
  ])

  // State for timeboxing schedule
  const [schedule, setSchedule] = useState<
    {
      day: string
      timeBlock: string
      task: string
      energyLevel: string
      type: string
      completed: boolean
    }[]
  >([
    {
      day: "Monday",
      timeBlock: "9:00 - 10:30",
      task: "Content creation for social media",
      energyLevel: "High",
      type: "Creative",
      completed: false,
    },
    {
      day: "Monday",
      timeBlock: "11:00 - 12:00",
      task: "Client emails and admin",
      energyLevel: "Medium",
      type: "Admin",
      completed: false,
    },
    {
      day: "Monday",
      timeBlock: "2:00 - 4:00",
      task: "Work on Automation Templates",
      energyLevel: "Medium",
      type: "Creative",
      completed: false,
    },
    {
      day: "Tuesday",
      timeBlock: "9:00 - 10:00",
      task: "Morning pages & planning",
      energyLevel: "Medium",
      type: "Admin",
      completed: false,
    },
  ])

  // Calculate total revenue
  const totalRevenue = revenue.reduce((sum, item) => sum + item.amount, 0)
  const revenueGoal = 5000
  const revenueProgress = Math.min((totalRevenue / revenueGoal) * 100, 100)

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, item) => sum + item.amount, 0)

  // Platform options for dropdown
  const platformOptions = ["Shopify", "Etsy", "Upwork", "Fiverr", "Patreon", "Ko-fi", "Direct", "Other"]

  // Product type options
  const productTypeOptions = ["Digital", "Physical", "Service", "Membership"]

  // Product stage options
  const stageOptions = ["Idea", "In Progress", "Launched"]

  // Energy level options
  const energyLevelOptions = ["Low", "Medium", "High"]

  // Task type options
  const taskTypeOptions = ["Creative", "Admin", "Healing", "Errands", "Learning"]

  // Expense category options
  const expenseCategoryOptions = ["Software", "Marketing", "Office", "Travel", "Education", "Other"]

  return (
    <div className="min-h-screen bg-[#0A192F] text-[#FAF3E0] p-4 md:p-8">
      <header className="mb-8 text-center">
        <div className="flex items-center justify-center mb-4">
          <Moon className="h-8 w-8 text-[#D4AF37] mr-2" />
          <Flower className="h-8 w-8 text-[#FAF3E0] mr-2" />
          <h1 className="text-3xl md:text-4xl font-bold text-[#D4AF37] font-serif">Midnight Magnolia</h1>
        </div>
        <p className="text-lg text-[#A3B18A]">Business Planner for Latisha Vincent-Waters</p>
      </header>

      <Tabs defaultValue="dashboard" className="w-full">
        <TabsList className="grid grid-cols-3 md:grid-cols-9 bg-[#0A3B4D] mb-6">
          <TabsTrigger
            value="dashboard"
            className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="revenue" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Revenue</span>
          </TabsTrigger>
          <TabsTrigger value="products" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <Flower className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Products</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <DollarSign className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Expenses</span>
          </TabsTrigger>
          <TabsTrigger value="schedule" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <Clock className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <CalendarIcon className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Content</span>
          </TabsTrigger>
          <TabsTrigger value="learning" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <BookOpen className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Learning</span>
          </TabsTrigger>
          <TabsTrigger value="healing" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <Heart className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Healing</span>
          </TabsTrigger>
          <TabsTrigger value="ideas" className="data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A192F]">
            <Lightbulb className="h-4 w-4 mr-2" />
            <span className="hidden md:inline">Ideas</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#D4AF37] flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Revenue Overview
                </CardTitle>
                <CardDescription className="text-[#FAF3E0]">Monthly progress toward $5,000 goal</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-[#FAF3E0]">Current: ${totalRevenue.toFixed(2)}</span>
                    <span className="text-[#D4AF37]">Goal: $5,000.00</span>
                  </div>
                  <Progress value={revenueProgress} className="h-3 bg-[#051224]" indicatorClassName="bg-[#D4AF37]" />
                  <p className="text-sm text-[#A3B18A] mt-2">
                    {revenueProgress < 100
                      ? `$${(revenueGoal - totalRevenue).toFixed(2)} remaining to reach your goal`
                      : "Congratulations! You've reached your monthly goal 🎉"}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
              <CardHeader>
                <CardTitle className="text-[#D4AF37] flex items-center">
                  <Flower className="h-5 w-5 mr-2" />
                  Product Pipeline
                </CardTitle>
                <CardDescription className="text-[#FAF3E0]">Upcoming product launches</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products
                    .filter((product) => !product.completed && product.stage !== "Idea")
                    .slice(0, 3)
                    .map((product, index) => (
                      <div key={index} className="flex items-center justify-between border-b border-[#A3B18A] pb-2">
                        <div>
                          <p className="font-medium text-[#FAF3E0]">{product.name}</p>
                          <p className="text-sm text-[#A3B18A]">
                            Launch: {new Date(product.launchDate).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge
                          className={
                            product.stage === "Launched"
                              ? "bg-green-600"
                              : product.stage === "In Progress"
                                ? "bg-[#D4AF37]"
                                : "bg-[#4B3D5B]"
                          }
                        >
                          {product.stage}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg md:col-span-2">
              <CardHeader>
                <CardTitle className="text-[#D4AF37] flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Today's Schedule
                </CardTitle>
                <CardDescription className="text-[#FAF3E0]">Your timeboxed tasks for today</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {schedule
                    .filter((item) => item.day === getCurrentDay())
                    .map((item, index) => (
                      <div key={index} className="flex items-center justify-between border-b border-[#A3B18A] pb-2">
                        <div className="flex items-center">
                          <Checkbox
                            id={`task-${index}`}
                            checked={item.completed}
                            className="border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0A192F]"
                          />
                          <div className="ml-4">
                            <p
                              className={`font-medium ${item.completed ? "line-through text-[#A3B18A]" : "text-[#FAF3E0]"}`}
                            >
                              {item.task}
                            </p>
                            <p className="text-sm text-[#A3B18A]">{item.timeBlock}</p>
                          </div>
                        </div>
                        <Badge
                          className={
                            item.energyLevel === "High"
                              ? "bg-green-600"
                              : item.energyLevel === "Medium"
                                ? "bg-[#D4AF37]"
                                : "bg-[#4B3D5B]"
                          }
                        >
                          {item.energyLevel}
                        </Badge>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Revenue Tracker
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">Track your income sources and progress</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Input
                      type="date"
                      placeholder="Date"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Input
                      placeholder="Source"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Input
                      placeholder="Product/Service"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[180px]">
                        <SelectValue placeholder="Platform" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {platformOptions.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Button className="bg-[#D4AF37] text-[#0A192F] hover:bg-[#BF9D30]">Add Entry</Button>
                  </div>
                </div>

                <div className="rounded-md border border-[#A3B18A] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#051224]">
                      <TableRow>
                        <TableHead className="text-[#D4AF37]">Date</TableHead>
                        <TableHead className="text-[#D4AF37]">Source</TableHead>
                        <TableHead className="text-[#D4AF37]">Product/Service</TableHead>
                        <TableHead className="text-[#D4AF37]">Platform</TableHead>
                        <TableHead className="text-[#D4AF37]">Amount</TableHead>
                        <TableHead className="text-[#D4AF37]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {revenue.map((item, index) => (
                        <TableRow
                          key={index}
                          className={
                            item.amount > 100
                              ? "bg-[rgba(163,177,138,0.2)]"
                              : item.amount < 20
                                ? "bg-[rgba(75,61,91,0.2)]"
                                : ""
                          }
                        >
                          <TableCell className="text-[#FAF3E0]">{formatDate(item.date)}</TableCell>
                          <TableCell className="text-[#FAF3E0]">{item.source}</TableCell>
                          <TableCell className="text-[#FAF3E0]">{item.product}</TableCell>
                          <TableCell className="text-[#FAF3E0]">{item.platform}</TableCell>
                          <TableCell
                            className={
                              item.amount > 100
                                ? "text-green-400 font-medium"
                                : item.amount < 20
                                  ? "text-[#D4AF37]"
                                  : "text-[#FAF3E0]"
                            }
                          >
                            ${item.amount.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-[#A3B18A]">{item.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center p-4 bg-[#051224] rounded-md">
                  <div>
                    <p className="text-[#FAF3E0]">
                      Monthly Total: <span className="text-[#D4AF37] font-bold">${totalRevenue.toFixed(2)}</span>
                    </p>
                    <p className="text-sm text-[#A3B18A]">Goal: $5,000.00</p>
                  </div>
                  <div className="w-64">
                    <Progress value={revenueProgress} className="h-3 bg-[#0A192F]" indicatorClassName="bg-[#D4AF37]" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <Flower className="h-5 w-5 mr-2" />
                Product & Service Pipeline
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">Track your products from idea to launch</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Input
                      placeholder="Product Name"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {productTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {stageOptions.map((stage) => (
                          <SelectItem key={stage} value={stage}>
                            {stage}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="date"
                      placeholder="Launch Date"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Button className="bg-[#D4AF37] text-[#0A192F] hover:bg-[#BF9D30]">Add Product</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {stageOptions.map((stage) => (
                    <div key={stage} className="space-y-4">
                      <h3
                        className={
                          stage === "Launched"
                            ? "text-green-400"
                            : stage === "In Progress"
                              ? "text-[#D4AF37]"
                              : "text-[#A3B18A]"
                        }
                      >
                        {stage}
                      </h3>

                      {products
                        .filter((product) => product.stage === stage)
                        .map((product, index) => (
                          <Card
                            key={index}
                            className={`bg-[#051224] border-[#A3B18A] ${product.completed ? "opacity-60" : ""}`}
                          >
                            <CardHeader className="pb-2">
                              <div className="flex justify-between items-start">
                                <CardTitle className="text-[#FAF3E0] text-lg">{product.name}</CardTitle>
                                <Checkbox
                                  checked={product.completed}
                                  className="border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0A192F]"
                                />
                              </div>
                              <CardDescription className="text-[#A3B18A]">{product.type}</CardDescription>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-sm space-y-1">
                                <div className="flex justify-between">
                                  <span className="text-[#A3B18A]">Price:</span>
                                  <span className="text-[#D4AF37]">${product.price}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#A3B18A]">Launch:</span>
                                  <span className="text-[#FAF3E0]">{formatDate(product.launchDate)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-[#A3B18A]">Potential:</span>
                                  <span className="text-[#FAF3E0]">{product.potential}</span>
                                </div>
                                {product.notes && <p className="text-[#A3B18A] mt-2 italic">{product.notes}</p>}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Expense Log
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">Track your business expenses</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Input
                      type="date"
                      placeholder="Date"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Input
                      placeholder="Vendor"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {expenseCategoryOptions.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Button className="bg-[#D4AF37] text-[#0A192F] hover:bg-[#BF9D30]">Add Expense</Button>
                  </div>
                </div>

                <div className="rounded-md border border-[#A3B18A] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#051224]">
                      <TableRow>
                        <TableHead className="text-[#D4AF37]">Date</TableHead>
                        <TableHead className="text-[#D4AF37]">Vendor</TableHead>
                        <TableHead className="text-[#D4AF37]">Purpose</TableHead>
                        <TableHead className="text-[#D4AF37]">Category</TableHead>
                        <TableHead className="text-[#D4AF37]">Amount</TableHead>
                        <TableHead className="text-[#D4AF37]">Paid</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expenses.map((item, index) => (
                        <TableRow key={index} className={!item.paid ? "bg-[rgba(75,61,91,0.3)]" : ""}>
                          <TableCell className="text-[#FAF3E0]">{formatDate(item.date)}</TableCell>
                          <TableCell className="text-[#FAF3E0]">{item.vendor}</TableCell>
                          <TableCell className="text-[#FAF3E0]">{item.purpose}</TableCell>
                          <TableCell className="text-[#FAF3E0]">{item.category}</TableCell>
                          <TableCell className="text-[#FAF3E0]">${item.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            <Checkbox
                              checked={item.paid}
                              className="border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0A192F]"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex justify-between items-center p-4 bg-[#051224] rounded-md">
                  <div>
                    <p className="text-[#FAF3E0]">
                      Monthly Total: <span className="text-[#D4AF37] font-bold">${totalExpenses.toFixed(2)}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[#FAF3E0]">
                      Unpaid:{" "}
                      <span className="text-[#D4AF37] font-bold">
                        $
                        {expenses
                          .filter((e) => !e.paid)
                          .reduce((sum, item) => sum + item.amount, 0)
                          .toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Timeboxing Schedule
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">
                Plan your week according to your energy levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Day" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                          <SelectItem key={day} value={day}>
                            {day}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Time Block (e.g., 9:00 - 10:30)"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Input
                      placeholder="Task"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Energy Level" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {energyLevelOptions.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {taskTypeOptions.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="bg-[#D4AF37] text-[#0A192F] hover:bg-[#BF9D30]">Add Task</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                  {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                    <div key={day} className="space-y-4">
                      <h3 className="text-[#D4AF37] font-medium">{day}</h3>

                      {schedule
                        .filter((item) => item.day === day)
                        .map((item, index) => (
                          <Card
                            key={index}
                            className={`bg-[#051224] border-[#A3B18A] ${item.completed ? "opacity-60" : ""}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-[#FAF3E0] font-medium">{item.timeBlock}</span>
                                <Checkbox
                                  checked={item.completed}
                                  className="border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0A192F]"
                                />
                              </div>
                              <p
                                className={`text-sm ${item.completed ? "line-through text-[#A3B18A]" : "text-[#FAF3E0]"}`}
                              >
                                {item.task}
                              </p>
                              <div className="flex justify-between mt-2 text-xs">
                                <Badge
                                  className={
                                    item.energyLevel === "High"
                                      ? "bg-green-600"
                                      : item.energyLevel === "Medium"
                                        ? "bg-[#D4AF37]"
                                        : "bg-[#4B3D5B]"
                                  }
                                >
                                  {item.energyLevel}
                                </Badge>
                                <span className="text-[#A3B18A]">{item.type}</span>
                              </div>
                            </CardContent>
                          </Card>
                        ))}

                      {schedule.filter((item) => item.day === day).length === 0 && (
                        <div className="p-3 border border-dashed border-[#A3B18A] rounded-md text-center">
                          <p className="text-[#A3B18A] text-sm">No tasks scheduled</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Content Calendar Tab */}
        <TabsContent value="content">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <CalendarIcon className="h-5 w-5 mr-2" />
                Content Calendar
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">Plan and track your content creation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex justify-center mb-4">
                  <Calendar
                    className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] rounded-md p-3"
                    classNames={{
                      day_selected: "bg-[#D4AF37] text-[#0A192F]",
                      day_today: "border-[#D4AF37] text-[#D4AF37]",
                      day_outside: "text-[#A3B18A] opacity-50",
                    }}
                  />
                </div>

                <div className="rounded-md border border-[#A3B18A] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#051224]">
                      <TableRow>
                        <TableHead className="text-[#D4AF37]">Post Date</TableHead>
                        <TableHead className="text-[#D4AF37]">Platform</TableHead>
                        <TableHead className="text-[#D4AF37]">Topic</TableHead>
                        <TableHead className="text-[#D4AF37]">Media Asset</TableHead>
                        <TableHead className="text-[#D4AF37]">CTA</TableHead>
                        <TableHead className="text-[#D4AF37]">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-[#FAF3E0]">Apr 5, 2025</TableCell>
                        <TableCell className="text-[#FAF3E0]">Instagram</TableCell>
                        <TableCell className="text-[#FAF3E0]">Brand Story</TableCell>
                        <TableCell className="text-[#FAF3E0]">
                          <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">
                            Image
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#FAF3E0]">Visit Website</TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">Posted</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-[#FAF3E0]">Apr 7, 2025</TableCell>
                        <TableCell className="text-[#FAF3E0]">LinkedIn</TableCell>
                        <TableCell className="text-[#FAF3E0]">Automation Tips</TableCell>
                        <TableCell className="text-[#FAF3E0]">
                          <Badge variant="outline" className="border-[#D4AF37] text-[#D4AF37]">
                            Carousel
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#FAF3E0]">Download Guide</TableCell>
                        <TableCell>
                          <Badge className="bg-[#D4AF37]">Scheduled</Badge>
                        </TableCell>
                      </TableRow>
                      <TableRow className="bg-[rgba(75,61,91,0.2)]">
                        <TableCell className="text-[#FAF3E0]">Apr 10, 2025</TableCell>
                        <TableCell className="text-[#FAF3E0]">Instagram</TableCell>
                        <TableCell className="text-[#FAF3E0]">Product Launch</TableCell>
                        <TableCell className="text-[#FAF3E0]">
                          <Badge variant="outline" className="border-red-400 text-red-400">
                            Missing
                          </Badge>
                        </TableCell>
                        <TableCell className="text-[#FAF3E0]">Shop Now</TableCell>
                        <TableCell>
                          <Badge className="bg-[#4B3D5B]">Draft</Badge>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Learning Tab */}
        <TabsContent value="learning">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                Learning Tracker
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">
                Track your courses and professional development
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card className="bg-[#051224] border-[#A3B18A]">
                    <CardHeader>
                      <CardTitle className="text-[#FAF3E0] text-lg">Advanced Web Development</CardTitle>
                      <CardDescription className="text-[#A3B18A]">Udemy</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Progress:</span>
                          <span className="text-[#FAF3E0]">75%</span>
                        </div>
                        <Progress value={75} className="h-2 bg-[#0A192F]" indicatorClassName="bg-[#D4AF37]" />
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Type:</span>
                          <span className="text-[#FAF3E0]">Technical</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Certificate:</span>
                          <span className="text-[#FAF3E0]">Yes</span>
                        </div>
                        <p className="text-[#A3B18A] text-sm italic">Complete by April 30th</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#051224] border-[#A3B18A]">
                    <CardHeader>
                      <CardTitle className="text-[#FAF3E0] text-lg">Digital Marketing Fundamentals</CardTitle>
                      <CardDescription className="text-[#A3B18A]">Coursera</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Progress:</span>
                          <span className="text-[#FAF3E0]">30%</span>
                        </div>
                        <Progress value={30} className="h-2 bg-[#0A192F]" indicatorClassName="bg-[#D4AF37]" />
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Type:</span>
                          <span className="text-[#FAF3E0]">Marketing</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Certificate:</span>
                          <span className="text-[#FAF3E0]">Yes</span>
                        </div>
                        <p className="text-[#A3B18A] text-sm italic">Focus on this when energy is medium</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#051224] border-[#A3B18A]">
                    <CardHeader>
                      <CardTitle className="text-[#FAF3E0] text-lg">AI for Creators</CardTitle>
                      <CardDescription className="text-[#A3B18A]">LinkedIn Learning</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Progress:</span>
                          <span className="text-[#FAF3E0]">10%</span>
                        </div>
                        <Progress value={10} className="h-2 bg-[#0A192F]" indicatorClassName="bg-[#D4AF37]" />
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Type:</span>
                          <span className="text-[#FAF3E0]">Technology</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-[#A3B18A]">Certificate:</span>
                          <span className="text-[#FAF3E0]">No</span>
                        </div>
                        <p className="text-[#A3B18A] text-sm italic">New course - explore when inspired</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#051224] border-[#A3B18A] border-dashed flex items-center justify-center p-6">
                    <Button className="bg-transparent border border-dashed border-[#A3B18A] text-[#A3B18A] hover:bg-[rgba(163,177,138,0.1)]">
                      + Add New Course
                    </Button>
                  </Card>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Healing Tab */}
        <TabsContent value="healing">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <Heart className="h-5 w-5 mr-2" />
                Healing & Mood Tracker
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">
                Monitor your wellbeing alongside your business
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Input
                      type="date"
                      placeholder="Date"
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Mood" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {["😊 Great", "🙂 Good", "😐 Neutral", "🙁 Low", "😔 Difficult"].map((mood) => (
                          <SelectItem key={mood} value={mood}>
                            {mood}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Pain Level (1-10)" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                          <SelectItem key={level} value={level.toString()}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Energy Level" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {energyLevelOptions.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button className="bg-[#D4AF37] text-[#0A192F] hover:bg-[#BF9D30]">Add Entry</Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="bg-[#051224] border-[#A3B18A]">
                    <CardHeader>
                      <CardTitle className="text-[#FAF3E0] text-lg">Today's Reflection</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[#A3B18A] block mb-2">What went well today?</label>
                          <textarea
                            className="w-full bg-[#0A192F] border border-[#A3B18A] rounded-md p-3 text-[#FAF3E0] placeholder:text-[#A3B18A]"
                            rows={3}
                            placeholder="I'm grateful for..."
                          ></textarea>
                        </div>
                        <div>
                          <label className="text-[#A3B18A] block mb-2">Today's affirmation</label>
                          <Input
                            placeholder="I am..."
                            className="bg-[#0A192F] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-[#051224] border-[#A3B18A]">
                    <CardHeader>
                      <CardTitle className="text-[#FAF3E0] text-lg">Weekly Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div>
                          <label className="text-[#A3B18A] block mb-2">Mood</label>
                          <div className="flex justify-between items-center h-8">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                              <div key={day} className="flex flex-col items-center">
                                <div
                                  className={`w-6 h-6 rounded-full ${
                                    i === 0
                                      ? "bg-green-500"
                                      : i === 1
                                        ? "bg-green-400"
                                        : i === 2
                                          ? "bg-yellow-400"
                                          : i === 3
                                            ? "bg-[#D4AF37]"
                                            : "bg-[#4B3D5B]"
                                  }`}
                                ></div>
                                <span className="text-xs text-[#A3B18A] mt-1">{day}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <label className="text-[#A3B18A] block mb-2">Pain Level</label>
                          <div className="flex justify-between items-end h-16">
                            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => (
                              <div key={day} className="flex flex-col items-center">
                                <div
                                  className={`w-6 bg-[#D4AF37] rounded-t-sm ${
                                    i === 0
                                      ? "h-4"
                                      : i === 1
                                        ? "h-6"
                                        : i === 2
                                          ? "h-8"
                                          : i === 3
                                            ? "h-10"
                                            : i === 4
                                              ? "h-8"
                                              : i === 5
                                                ? "h-6"
                                                : "h-4"
                                  }`}
                                ></div>
                                <span className="text-xs text-[#A3B18A] mt-1">{day}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-[#051224] rounded-md border border-[#A3B18A] text-center">
                  <p className="text-[#FAF3E0] mb-2">Calming Sounds</p>
                  <div className="flex justify-center gap-4">
                    <Button
                      variant="outline"
                      className="border-[#A3B18A] text-[#A3B18A] hover:bg-[rgba(163,177,138,0.1)]"
                    >
                      Rain
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#A3B18A] text-[#A3B18A] hover:bg-[rgba(163,177,138,0.1)]"
                    >
                      Ocean
                    </Button>
                    <Button
                      variant="outline"
                      className="border-[#A3B18A] text-[#A3B18A] hover:bg-[rgba(163,177,138,0.1)]"
                    >
                      Forest
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ideas Tab */}
        <TabsContent value="ideas">
          <Card className="bg-[#0A3B4D] border-[#A3B18A] shadow-lg">
            <CardHeader>
              <CardTitle className="text-[#D4AF37] flex items-center">
                <Lightbulb className="h-5 w-5 mr-2" />
                Idea Vault / Brain Dump
              </CardTitle>
              <CardDescription className="text-[#FAF3E0]">Capture your ideas before they slip away</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {["Product", "Content", "Marketing", "Business", "Creative", "Other"].map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Your idea..."
                      className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] placeholder:text-[#A3B18A]"
                    />
                  </div>
                  <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <Select>
                      <SelectTrigger className="bg-[#051224] border-[#A3B18A] text-[#FAF3E0] w-full md:w-[150px]">
                        <SelectValue placeholder="Priority" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#0A3B4D] border-[#A3B18A] text-[#FAF3E0]">
                        {["High", "Medium", "Low", "Someday"].map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {priority}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="monetize"
                        className="border-[#D4AF37] data-[state=checked]:bg-[#D4AF37] data-[state=checked]:text-[#0A192F]"
                      />
                      <label htmlFor="monetize" className="text-sm text-[#FAF3E0]">
                        Can Monetize?
                      </label>
                    </div>
                    <Button className="bg-[#D4AF37] text-[#0A192F] hover:bg-[#BF9D30]">Add Idea</Button>
                  </div>
                </div>

                <div className="rounded-md border border-[#A3B18A] overflow-hidden">
                  <Table>
                    <TableHeader className="bg-[#051224]">
                      <TableRow>
                        <TableHead className="text-[#D4AF37]">Category</TableHead>
                        <TableHead className="text-[#D4AF37]">Idea</TableHead>
                        <TableHead className="text-[#D4AF37]">Priority</TableHead>
                        <TableHead className="text-[#D4AF37]">Monetizable</TableHead>
                        <TableHead className="text-[#D4AF37]">Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="text-[#FAF3E0]">Product</TableCell>
                        <TableCell className="text-[#FAF3E0]">Southern Gothic Digital Art Collection</TableCell>
                        <TableCell>
                          <Badge className="bg-green-600">High</Badge>
                        </TableCell>
                        <TableCell className="text-[#FAF3E0]">Yes</TableCell>
                        <TableCell className="text-[#A3B18A]">Research print-on-demand options</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-[#FAF3E0]">Content</TableCell>
                        <TableCell className="text-[#FAF3E0]">Video series on automation for creatives</TableCell>
                        <TableCell>
                          <Badge className="bg-[#D4AF37]">Medium</Badge>
                        </TableCell>
                        <TableCell className="text-[#FAF3E0]">Yes</TableCell>
                        <TableCell className="text-[#A3B18A]">Could become a course later</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="text-[#FAF3E0]">Business</TableCell>
                        <TableCell className="text-[#FAF3E0]">
                          Membership community for Black women entrepreneurs
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-[#4B3D5B]">Someday</Badge>
                        </TableCell>
                        <TableCell className="text-[#FAF3E0]">Yes</TableCell>
                        <TableCell className="text-[#A3B18A]">Need more audience growth first</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Helper functions
function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
}

function getCurrentDay() {
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
  return days[new Date().getDay()]
}

